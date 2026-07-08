import type { HermesGatewayClient } from './hermes-client';
import { buildAuthorizationHeader, HermesGatewayError, normalizeGatewayUrl } from './rest-adapter';
import type {
  CapabilityInfo,
  GatewaySettings,
  HermesStreamEvent,
  HermesTurnInput,
  ModelInfo,
  ProfileInfo,
  SessionInfo,
  SkillInfo
} from '../shared/types';

type WebSocketLike = {
  onopen: ((event: Event) => void) | null;
  onmessage: ((event: MessageEvent<string>) => void) | null;
  onerror: ((event: Event) => void) | null;
  onclose: ((event: CloseEvent) => void) | null;
  send: (payload: string) => void;
  close: () => void;
};

type CatalogResource = 'models' | 'sessions' | 'skills' | 'profiles' | 'capabilities';

type CatalogItem = ModelInfo | SessionInfo | SkillInfo | ProfileInfo;

const CATALOG_TIMEOUT_MS = 5_000;

interface WebSocketAdapterOptions {
  createWebSocket?: (url: string) => WebSocketLike;
}

export function createHermesDashboardWebSocketClient(
  settings: GatewaySettings,
  options: WebSocketAdapterOptions = {}
): HermesGatewayClient {
  const wsUrl = buildDashboardWebSocketUrl(settings.gatewayUrl);
  const authorization = buildAuthorizationHeader(settings.token);
  const createWebSocket = options.createWebSocket ?? ((url: string) => new WebSocket(url));

  return {
    async health() {
      const socket = openSocket(createWebSocket, wsUrl, authorization);
      await socket.ready;
      socket.close();
      return {
        ok: true,
        status: 'dashboard_ws_ready'
      };
    },
    async listModels() {
      return requestCatalog<ModelInfo>(createWebSocket, wsUrl, authorization, 'models');
    },
    async listSessions() {
      return requestCatalog<SessionInfo>(createWebSocket, wsUrl, authorization, 'sessions');
    },
    async listSkills() {
      return requestCatalog<SkillInfo>(createWebSocket, wsUrl, authorization, 'skills');
    },
    async listProfiles() {
      return requestCatalog<ProfileInfo>(createWebSocket, wsUrl, authorization, 'profiles');
    },
    async listCapabilities() {
      return requestCapabilities(createWebSocket, wsUrl, authorization);
    },
    async *sendTurn(input: HermesTurnInput) {
      const socket = openSocket(createWebSocket, wsUrl, authorization);
      await socket.ready;
      socket.send(buildChatPayload(input));

      for await (const event of socket.events()) {
        yield event;
        if (event.type === 'done' || event.type === 'error') {
          socket.close();
          return;
        }
      }
    }
  };
}

async function requestCatalog<T extends CatalogItem>(
  createWebSocket: (url: string) => WebSocketLike,
  wsUrl: string,
  authorization: string | undefined,
  resource: Exclude<CatalogResource, 'capabilities'>
): Promise<T[]> {
  const socket = openSocket(createWebSocket, wsUrl, authorization);
  await socket.ready;
  socket.send({
    type: 'catalog',
    resource
  });

  try {
    const raw = await socket.nextCatalog(resource, CATALOG_TIMEOUT_MS);
    return normalizeCatalogList<T>(raw, resource);
  } finally {
    socket.close();
  }
}

async function requestCapabilities(
  createWebSocket: (url: string) => WebSocketLike,
  wsUrl: string,
  authorization: string | undefined
): Promise<CapabilityInfo> {
  const socket = openSocket(createWebSocket, wsUrl, authorization);
  await socket.ready;
  socket.send({
    type: 'catalog',
    resource: 'capabilities'
  });

  try {
    const raw = await socket.nextCatalog('capabilities', CATALOG_TIMEOUT_MS);
    return normalizeCapabilities(raw);
  } finally {
    socket.close();
  }
}

export function createDashboardWebSocketStub(): never {
  throw new HermesGatewayError(
    'configuration',
    'Remote dashboard WebSocket mode is not implemented yet; use Local API or Remote API fallback.'
  );
}

function buildChatPayload(input: HermesTurnInput): Record<string, unknown> {
  return {
    type: 'chat',
    message: input.message,
    ...(input.model ? { model: input.model } : {}),
    ...(input.profile ? { profile: input.profile } : {}),
    ...(input.sessionId ? { session_id: input.sessionId } : {}),
    ...(input.context ? { context: input.context } : {})
  };
}

function buildDashboardWebSocketUrl(gatewayUrl: string): string {
  const url = new URL('/api/ws', `${normalizeGatewayUrl(gatewayUrl)}/`);
  url.protocol = url.protocol === 'https:' ? 'wss:' : 'ws:';
  url.username = '';
  url.password = '';
  url.search = '';
  url.hash = '';
  return url.toString();
}

function openSocket(
  createWebSocket: (url: string) => WebSocketLike,
  wsUrl: string,
  authorization: string | undefined
) {
  const socket = createWebSocket(wsUrl);
  const queue: HermesStreamEvent[] = [];
  const catalogQueue: unknown[] = [];
  const waiters: Array<(value: IteratorResult<HermesStreamEvent>) => void> = [];
  const catalogWaiters: Array<(value: unknown) => void> = [];
  let closed = false;
  let openResolve: (() => void) | undefined;
  let openReject: ((error: Error) => void) | undefined;

  const ready = new Promise<void>((resolve, reject) => {
    openResolve = resolve;
    openReject = reject;
  });

  socket.onopen = () => {
    if (authorization) {
      socket.send(JSON.stringify({ type: 'hello', authorization }));
    }
    openResolve?.();
  };

  socket.onmessage = (event) => {
    const catalogMessage = parseCatalogMessage(event.data);
    if (catalogMessage) {
      pushCatalog(catalogMessage);
      return;
    }

    const streamEvent = parseWebSocketEvent(event.data);
    if (streamEvent) {
      pushEvent(streamEvent);
    }
  };

  socket.onerror = () => {
    const error = new HermesGatewayError('network', 'Dashboard WebSocket connection failed.');
    openReject?.(error);
    pushEvent({ type: 'error', message: error.message });
  };

  socket.onclose = () => {
    closed = true;
    flushWaiters();
  };

  function pushEvent(event: HermesStreamEvent) {
    const waiter = waiters.shift();
    if (waiter) {
      waiter({ done: false, value: event });
      return;
    }
    queue.push(event);
  }

  function pushCatalog(payload: unknown) {
    const waiter = catalogWaiters.shift();
    if (waiter) {
      waiter(payload);
      return;
    }
    catalogQueue.push(payload);
  }

  function flushWaiters() {
    while (waiters.length > 0) {
      waiters.shift()?.({ done: true, value: undefined });
    }
  }

  return {
    ready,
    send(payload: unknown) {
      socket.send(JSON.stringify(payload));
    },
    close() {
      closed = true;
      socket.close();
      flushWaiters();
    },
    async nextCatalog(resource: CatalogResource, timeoutMs: number): Promise<unknown> {
      const queuedIndex = catalogQueue.findIndex((item) => catalogMatchesResource(item, resource));
      if (queuedIndex >= 0) {
        const [queued] = catalogQueue.splice(queuedIndex, 1);
        return queued;
      }

      return new Promise((resolve, reject) => {
        const timeout = globalThis.setTimeout(() => {
          reject(new HermesGatewayError('timeout', `Dashboard WebSocket catalog request timed out for ${resource}.`));
        }, timeoutMs);

        catalogWaiters.push((value) => {
          globalThis.clearTimeout(timeout);
          if (catalogMatchesResource(value, resource)) {
            resolve(value);
            return;
          }
          catalogQueue.push(value);
          reject(new HermesGatewayError('parse', `Dashboard WebSocket returned an unexpected catalog response for ${resource}.`));
        });
      });
    },
    async *events(): AsyncIterable<HermesStreamEvent> {
      while (!closed || queue.length > 0) {
        const queued = queue.shift();
        if (queued) {
          yield queued;
          continue;
        }

        const next = await new Promise<IteratorResult<HermesStreamEvent>>((resolve) => {
          waiters.push(resolve);
        });
        if (next.done) {
          return;
        }
        yield next.value;
      }
    }
  };
}

function parseCatalogMessage(raw: string): unknown | undefined {
  let parsed: unknown;
  try {
    parsed = JSON.parse(raw);
  } catch {
    return undefined;
  }

  if (!isRecord(parsed) || typeof parsed.type !== 'string') {
    return undefined;
  }

  if (
    parsed.type === 'catalog' ||
    parsed.type === 'catalog_result' ||
    parsed.type === 'models' ||
    parsed.type === 'sessions' ||
    parsed.type === 'skills' ||
    parsed.type === 'profiles' ||
    parsed.type === 'capabilities'
  ) {
    return parsed;
  }

  return undefined;
}

function catalogMatchesResource(value: unknown, resource: CatalogResource): boolean {
  if (!isRecord(value)) {
    return false;
  }

  return (
    value.type === resource ||
    value.resource === resource ||
    Array.isArray(value[resource]) ||
    (resource === 'capabilities' && (isRecord(value.flags) || isRecord(value.capabilities)))
  );
}

function normalizeCatalogList<T extends CatalogItem>(raw: unknown, key: string): T[] {
  const value = findCatalogList(raw, key);
  return value.flatMap((item, index) => normalizeCatalogItem<T>(item, index));
}

function findCatalogList(raw: unknown, key: string): unknown[] {
  if (Array.isArray(raw)) {
    return raw;
  }

  if (!isRecord(raw)) {
    return [];
  }

  for (const candidate of [key, 'data', 'items', 'results']) {
    const value = raw[candidate];
    if (Array.isArray(value)) {
      return value;
    }
  }

  return [];
}

function normalizeCatalogItem<T extends CatalogItem>(item: unknown, index: number): T[] {
  if (typeof item === 'string') {
    return [{ id: item } as T];
  }

  if (!isRecord(item)) {
    return [];
  }

  const id = item.id ?? item.name ?? item.slug ?? item.model;
  if (typeof id !== 'string' || !id) {
    return [{ ...item, id: `item-${index + 1}` } as T];
  }

  return [{ ...item, id } as T];
}

function normalizeCapabilities(raw: unknown): CapabilityInfo {
  if (!isRecord(raw)) {
    return { flags: { dashboard_ws: true }, raw };
  }

  const source = isRecord(raw.capabilities)
    ? raw.capabilities
    : isRecord(raw.data)
      ? raw.data
      : raw;
  const flagsSource = isRecord(source.flags) ? source.flags : source;
  const flags = Object.fromEntries(
    Object.entries(flagsSource).filter((entry): entry is [string, boolean] => typeof entry[1] === 'boolean')
  );

  return {
    flags: {
      dashboard_ws: true,
      ...flags
    },
    raw
  };
}

function parseWebSocketEvent(raw: string): HermesStreamEvent | undefined {
  let parsed: unknown;
  try {
    parsed = JSON.parse(raw);
  } catch {
    return { type: 'warning', message: 'Unparseable WebSocket event skipped.' };
  }

  if (!isRecord(parsed) || typeof parsed.type !== 'string') {
    return undefined;
  }

  if (parsed.type === 'delta' && typeof parsed.text === 'string') {
    return { type: 'delta', text: parsed.text };
  }
  if (parsed.type === 'tool' && typeof parsed.name === 'string') {
    return {
      type: 'tool',
      name: parsed.name,
      status: typeof parsed.status === 'string' ? parsed.status : undefined
    };
  }
  if (parsed.type === 'warning' && typeof parsed.message === 'string') {
    return { type: 'warning', message: parsed.message };
  }
  if (parsed.type === 'error' && typeof parsed.message === 'string') {
    return { type: 'error', message: parsed.message };
  }
  if (parsed.type === 'done') {
    return { type: 'done' };
  }

  return undefined;
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null && !Array.isArray(value);
}

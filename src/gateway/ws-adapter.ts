import type { HermesGatewayClient } from './hermes-client';
import { buildAuthorizationHeader, HermesGatewayError, normalizeGatewayUrl } from './rest-adapter';
import type {
  GatewaySettings,
  HermesStreamEvent,
  HermesTurnInput
} from '../shared/types';

type WebSocketLike = {
  onopen: ((event: Event) => void) | null;
  onmessage: ((event: MessageEvent<string>) => void) | null;
  onerror: ((event: Event) => void) | null;
  onclose: ((event: CloseEvent) => void) | null;
  send: (payload: string) => void;
  close: () => void;
};

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
      return [];
    },
    async listSessions() {
      return [];
    },
    async listSkills() {
      return [];
    },
    async listProfiles() {
      return [];
    },
    async listCapabilities() {
      return { flags: { dashboard_ws: true } };
    },
    async *sendTurn(input: HermesTurnInput) {
      const socket = openSocket(createWebSocket, wsUrl, authorization);
      await socket.ready;
      socket.send({
        type: 'turn',
        input
      });

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

export function createDashboardWebSocketStub(): never {
  throw new HermesGatewayError(
    'configuration',
    'Remote dashboard WebSocket mode is not implemented yet; use Local API or Remote API fallback.'
  );
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
  const waiters: Array<(value: IteratorResult<HermesStreamEvent>) => void> = [];
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

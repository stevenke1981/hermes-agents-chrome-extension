import type { HermesGatewayClient } from './hermes-client';
import { parseHermesStreamChunk } from './stream-parser';
import type {
  CapabilityInfo,
  GatewayCatalog,
  GatewayProbeResult,
  GatewaySettings,
  HermesStreamEvent,
  HermesTurnInput,
  HealthStatus,
  ModelInfo,
  ProfileInfo,
  SessionInfo,
  SkillInfo
} from '../shared/types';

const DEFAULT_TIMEOUT_MS = 5_000;

const ENDPOINTS = {
  health: '/health',
  models: '/v1/models',
  sessions: '/api/sessions',
  skills: '/v1/skills',
  profiles: '/v1/profiles',
  capabilities: '/v1/capabilities',
  chat: '/v1/chat/completions'
} as const;

type JsonRecord = Record<string, unknown>;

export class HermesGatewayError extends Error {
  readonly category: 'configuration' | 'network' | 'http' | 'timeout' | 'parse';
  readonly status?: number;

  constructor(
    category: HermesGatewayError['category'],
    message: string,
    options: { status?: number; cause?: unknown } = {}
  ) {
    super(redactSensitiveText(message), { cause: options.cause });
    this.name = 'HermesGatewayError';
    this.category = category;
    this.status = options.status;
  }
}

export function redactSensitiveText(value: string): string {
  return value
    .replace(/Authorization:\s*Bearer\s+"[^"]+"/gi, 'Authorization: Bearer [REDACTED]')
    .replace(/\bBearer\s+"[^"]+"/gi, 'Bearer [REDACTED]')
    .replace(/Authorization:\s*Bearer\s+[A-Za-z0-9._~+/=-]+/gi, 'Authorization: Bearer [REDACTED]')
    .replace(/\bBearer\s+[A-Za-z0-9._~+/=-]+/gi, 'Bearer [REDACTED]')
    .replace(/\b(token|key|auth|api_key|password|secret)=([^&\s]+)/gi, '$1=[REDACTED]')
    .replace(/\b[A-Za-z0-9_-]+\.[A-Za-z0-9_-]+\.[A-Za-z0-9_-]+\b/g, '[REDACTED_JWT]')
    .replace(/\b(ghp|github_pat|xoxb|xoxp|sk)-[A-Za-z0-9_-]{8,}\b/g, '[REDACTED_TOKEN]');
}

export function normalizeGatewayUrl(input: string): string {
  const trimmed = input.trim();
  if (!trimmed) {
    throw new HermesGatewayError('configuration', 'Gateway URL is required.');
  }

  let parsed: URL;
  try {
    parsed = new URL(trimmed);
  } catch (error) {
    throw new HermesGatewayError('configuration', 'Gateway URL must be a valid URL.', {
      cause: error
    });
  }

  if (parsed.protocol !== 'http:' && parsed.protocol !== 'https:') {
    throw new HermesGatewayError('configuration', 'Gateway URL must use http or https for REST mode.');
  }

  parsed.username = '';
  parsed.password = '';
  parsed.hash = '';
  parsed.search = '';
  return parsed.toString().replace(/\/$/, '');
}

export function getGatewayOrigin(settings: GatewaySettings): string {
  return new URL(normalizeGatewayUrl(settings.gatewayUrl)).origin;
}

export function getRemoteGatewayWarning(settings: GatewaySettings): string | undefined {
  const url = new URL(normalizeGatewayUrl(settings.gatewayUrl));
  const localHosts = new Set(['127.0.0.1', 'localhost', '::1']);
  if (settings.mode === 'remote_api' && url.protocol === 'http:' && !localHosts.has(url.hostname)) {
    return 'Remote HTTP gateway should be protected by LAN, Tailscale/VPN, or HTTPS reverse proxy.';
  }
  return undefined;
}

export function createHermesRestClient(settings: GatewaySettings): HermesGatewayClient {
  const baseUrl = normalizeGatewayUrl(settings.gatewayUrl);
  const authorizationHeader = buildAuthorizationHeader(settings.token);

  async function requestJson<T>(path: string): Promise<T> {
    const response = await request(path, { method: 'GET' });
    try {
      return (await response.json()) as T;
    } catch (error) {
      throw new HermesGatewayError('parse', `Hermes Gateway returned invalid JSON for ${path}.`, {
        cause: error
      });
    }
  }

  async function request(path: string, init: RequestInit): Promise<Response> {
    const controller = new AbortController();
    const timeout = globalThis.setTimeout(() => controller.abort(), DEFAULT_TIMEOUT_MS);

    try {
      const response = await fetch(new URL(path, `${baseUrl}/`), {
        ...init,
        headers: {
          Accept: 'application/json',
          ...init.headers,
          ...(authorizationHeader ? { Authorization: authorizationHeader } : {})
        },
        signal: controller.signal
      });

      if (!response.ok) {
        throw new HermesGatewayError(
          'http',
          `Hermes Gateway returned HTTP ${response.status} for ${path}.`,
          { status: response.status }
        );
      }

      return response;
    } catch (error) {
      if (error instanceof HermesGatewayError) {
        throw error;
      }

      if (error instanceof DOMException && error.name === 'AbortError') {
        throw new HermesGatewayError('timeout', `Hermes Gateway request timed out for ${path}.`, {
          cause: error
        });
      }

      throw new HermesGatewayError('network', 'Cannot reach Hermes Gateway. Check /health.', {
        cause: error
      });
    } finally {
      globalThis.clearTimeout(timeout);
    }
  }

  return {
    async health() {
      return normalizeHealth(await requestJson<unknown>(ENDPOINTS.health));
    },
    async listModels() {
      return normalizeList<ModelInfo>(await requestJson<unknown>(ENDPOINTS.models), 'models');
    },
    async listSessions() {
      return normalizeList<SessionInfo>(await requestJson<unknown>(ENDPOINTS.sessions), 'sessions');
    },
    async listSkills() {
      return normalizeList<SkillInfo>(await requestJson<unknown>(ENDPOINTS.skills), 'skills');
    },
    async listProfiles() {
      return normalizeList<ProfileInfo>(await requestJson<unknown>(ENDPOINTS.profiles), 'profiles');
    },
    async listCapabilities() {
      return normalizeCapabilities(await requestJson<unknown>(ENDPOINTS.capabilities));
    },
    async *sendTurn(input: HermesTurnInput) {
      const response = await request(ENDPOINTS.chat, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          model: input.model,
          messages: buildMessages(input),
          stream: true,
          session_id: input.sessionId,
          profile: input.profile
        })
      });

      yield* readStreamEvents(response);
    }
  };
}

function buildAuthorizationHeader(token?: string): string | undefined {
  const trimmed = token?.trim();
  if (!trimmed) {
    return undefined;
  }

  return /^Bearer\s+/i.test(trimmed) ? trimmed.replace(/^Bearer\s+/i, 'Bearer ') : `Bearer ${trimmed}`;
}

export async function probeGateway(settings: GatewaySettings): Promise<GatewayProbeResult> {
  const client = createHermesRestClient(settings);
  const warnings = [
    getRemoteGatewayWarning(settings),
    settings.mode === 'remote_dashboard_ws'
      ? 'Remote dashboard WebSocket mode is not implemented yet; REST capability probe was used.'
      : undefined
  ].filter(Boolean) as string[];

  try {
    const health = await client.health();
    const catalogResults = await Promise.allSettled([
      client.listModels(),
      client.listSessions(),
      client.listSkills(),
      client.listProfiles(),
      client.listCapabilities()
    ]);
    const catalog = collectCatalog(catalogResults, warnings);

    return {
      ...catalog,
      health,
      state: warnings.length > 0 ? 'connected_with_warning' : 'connected',
      gatewayOrigin: getGatewayOrigin(settings),
      warnings
    };
  } catch (error) {
    return {
      models: [],
      sessions: [],
      skills: [],
      profiles: [],
      state: 'error',
      gatewayOrigin: safeGatewayOrigin(settings),
      warnings,
      error: error instanceof Error ? redactSensitiveText(error.message) : 'Cannot reach Hermes Gateway.'
    };
  }
}

function collectCatalog(
  results: PromiseSettledResult<unknown>[],
  warnings: string[]
): GatewayCatalog {
  const [models, sessions, skills, profiles, capabilities] = results;

  const catalog: GatewayCatalog = {
    models: settledValue<ModelInfo[]>(models, [], 'models', warnings),
    sessions: settledValue<SessionInfo[]>(sessions, [], 'sessions', warnings),
    skills: settledValue<SkillInfo[]>(skills, [], 'skills', warnings),
    profiles: settledValue<ProfileInfo[]>(profiles, [], 'profiles', warnings),
    capabilities: settledValue<CapabilityInfo | undefined>(
      capabilities,
      undefined,
      'capabilities',
      warnings
    )
  };

  return catalog;
}

function settledValue<T>(
  result: PromiseSettledResult<unknown>,
  fallback: T,
  label: string,
  warnings: string[]
): T {
  if (result.status === 'fulfilled') {
    return result.value as T;
  }

  const message = result.reason instanceof Error ? result.reason.message : 'unavailable';
  warnings.push(`${label} unavailable: ${redactSensitiveText(message)}`);
  return fallback;
}

function normalizeHealth(raw: unknown): HealthStatus {
  if (!isRecord(raw)) {
    return { ok: true, raw };
  }

  const ok = typeof raw.ok === 'boolean' ? raw.ok : raw.status !== 'error';
  return {
    ok,
    status: typeof raw.status === 'string' ? raw.status : undefined,
    version: typeof raw.version === 'string' ? raw.version : undefined,
    raw
  };
}

function normalizeCapabilities(raw: unknown): CapabilityInfo {
  if (!isRecord(raw)) {
    return { flags: {}, raw };
  }

  const flagsSource = isRecord(raw.flags) ? raw.flags : raw;
  const flags = Object.fromEntries(
    Object.entries(flagsSource).filter((entry): entry is [string, boolean] => typeof entry[1] === 'boolean')
  );

  return { flags, raw };
}

function normalizeList<T extends { id: string }>(raw: unknown, key: string): T[] {
  const value = findList(raw, key);
  return value.flatMap((item, index) => normalizeListItem<T>(item, index));
}

function findList(raw: unknown, key: string): unknown[] {
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

function normalizeListItem<T extends { id: string }>(item: unknown, index: number): T[] {
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

function isRecord(value: unknown): value is JsonRecord {
  return typeof value === 'object' && value !== null && !Array.isArray(value);
}

function safeGatewayOrigin(settings: GatewaySettings): string | undefined {
  try {
    return getGatewayOrigin(settings);
  } catch {
    return undefined;
  }
}

function buildMessages(input: HermesTurnInput) {
  const messages = [];
  if (input.context) {
    messages.push({ role: 'system', content: input.context });
  }
  messages.push({ role: 'user', content: input.message });
  return messages;
}

async function* readStreamEvents(response: Response): AsyncIterable<HermesStreamEvent> {
  if (!response.body) {
    yield { type: 'done' };
    return;
  }

  const reader = response.body.getReader();
  const decoder = new TextDecoder();
  let buffer = '';

  while (true) {
    const { done, value } = await reader.read();
    if (done) {
      break;
    }

    buffer += decoder.decode(value, { stream: true });
    const lines = buffer.split(/\r?\n/);
    buffer = lines.pop() ?? '';

    for (const line of lines) {
      const event = parseHermesStreamChunk(line);
      if (event) {
        yield event;
      }
    }
  }

  if (buffer) {
    const event = parseHermesStreamChunk(buffer);
    if (event) {
      yield event;
    }
  }
}

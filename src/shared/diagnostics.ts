import type {
  CapabilityInfo,
  ConnectionState,
  ContextScope,
  GatewayMode,
  RedactionEvent
} from './types';

export interface DiagnosticsInput {
  extensionVersion: string;
  browser: string;
  gatewayUrl?: string;
  mode: GatewayMode;
  connectionState: ConnectionState;
  capabilities?: CapabilityInfo;
  contextScope: ContextScope;
  extractorMode?: string;
  lastVisibleErrorCategory?: string;
  redactionCounts?: Record<string, number>;
  forbiddenDebugFields?: Record<string, unknown>;
}

export interface DiagnosticsPayload {
  extensionVersion: string;
  browser: string;
  gatewayOrigin?: string;
  mode: GatewayMode;
  connectionState: ConnectionState;
  capabilityFlags: Record<string, boolean>;
  contextScope: ContextScope;
  extractorMode?: string;
  lastVisibleErrorCategory?: string;
  redactionCounts: Record<string, number>;
  generatedAt: string;
}

export function createDiagnosticsPayload(input: DiagnosticsInput): DiagnosticsPayload {
  return {
    extensionVersion: input.extensionVersion,
    browser: input.browser,
    gatewayOrigin: sanitizeGatewayOrigin(input.gatewayUrl),
    mode: input.mode,
    connectionState: input.connectionState,
    capabilityFlags: input.capabilities?.flags ?? {},
    contextScope: input.contextScope,
    extractorMode: input.extractorMode,
    lastVisibleErrorCategory: input.lastVisibleErrorCategory,
    redactionCounts: input.redactionCounts ?? {},
    generatedAt: new Date().toISOString()
  };
}

export function summarizeRedactions(events: RedactionEvent[]): Record<string, number> {
  return events.reduce<Record<string, number>>((counts, event) => {
    counts[event.type] = (counts[event.type] ?? 0) + event.count;
    return counts;
  }, {});
}

function sanitizeGatewayOrigin(gatewayUrl?: string): string | undefined {
  if (!gatewayUrl) {
    return undefined;
  }

  try {
    return new URL(gatewayUrl).origin;
  } catch {
    return undefined;
  }
}

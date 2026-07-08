import type { HermesGatewayClient } from './hermes-client';
import {
  createHermesRestClient,
  getGatewayOrigin,
  getRemoteGatewayWarning,
  redactSensitiveText
} from './rest-adapter';
import { createHermesDashboardWebSocketClient } from './ws-adapter';
import type {
  CapabilityInfo,
  GatewayCatalog,
  GatewayProbeResult,
  GatewaySettings,
  ModelInfo,
  ProfileInfo,
  SessionInfo,
  SkillInfo
} from '../shared/types';

export function createHermesGatewayClient(settings: GatewaySettings): HermesGatewayClient {
  if (settings.mode === 'remote_dashboard_ws') {
    return createHermesDashboardWebSocketClient(settings);
  }

  return createHermesRestClient(settings);
}

export async function probeHermesGateway(settings: GatewaySettings): Promise<GatewayProbeResult> {
  const client = createHermesGatewayClient(settings);
  const warnings = [getRemoteGatewayWarning(settings)].filter(Boolean) as string[];

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

  return {
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

function safeGatewayOrigin(settings: GatewaySettings): string | undefined {
  try {
    return getGatewayOrigin(settings);
  } catch {
    return undefined;
  }
}

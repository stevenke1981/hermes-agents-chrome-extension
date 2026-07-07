import type { AGENT_MODES, CONTEXT_SCOPES } from './constants';

export type ContextScope = (typeof CONTEXT_SCOPES)[number];
export type AgentMode = (typeof AGENT_MODES)[number];

export type ConnectionState =
  | 'disconnected'
  | 'connecting'
  | 'connected'
  | 'connected_with_warning'
  | 'fallback'
  | 'error';

export interface GatewaySettings {
  mode: 'local_api' | 'remote_api' | 'remote_dashboard_ws';
  gatewayUrl: string;
  tokenSavedAt?: string;
  allowInsecureRemoteHttp: boolean;
  corsExtensionId?: string;
}

export interface SidePanelState {
  connectionState: ConnectionState;
  contextScope: ContextScope;
  agentMode: AgentMode;
  gatewaySettings: GatewaySettings;
}


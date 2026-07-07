import { DEFAULT_GATEWAY_URL } from './constants';
import type { GatewaySettings } from './types';

export const STORAGE_KEYS = {
  gatewaySettings: 'hermes.gateway.settings.v1',
  uiSettings: 'hermes.ui.settings.v1',
  contextSettings: 'hermes.context.settings.v1',
  sessionBindings: 'hermes.session.bindings.v1',
  localHistory: 'hermes.local.history.v1',
  diagnostics: 'hermes.diagnostics.last.v1'
} as const;

export const DEFAULT_GATEWAY_SETTINGS: GatewaySettings = {
  mode: 'local_api',
  gatewayUrl: DEFAULT_GATEWAY_URL,
  allowInsecureRemoteHttp: false
};


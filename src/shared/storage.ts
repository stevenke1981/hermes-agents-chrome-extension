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

function hasChromeStorage(): boolean {
  return typeof chrome !== 'undefined' && Boolean(chrome.storage?.local);
}

export async function loadGatewaySettings(): Promise<GatewaySettings> {
  if (!hasChromeStorage()) {
    return DEFAULT_GATEWAY_SETTINGS;
  }

  const result = await chrome.storage.local.get(STORAGE_KEYS.gatewaySettings);
  return {
    ...DEFAULT_GATEWAY_SETTINGS,
    ...(result[STORAGE_KEYS.gatewaySettings] as Partial<GatewaySettings> | undefined)
  };
}

export async function saveGatewaySettings(settings: GatewaySettings): Promise<void> {
  if (!hasChromeStorage()) {
    return;
  }

  await chrome.storage.local.set({
    [STORAGE_KEYS.gatewaySettings]: settings
  });
}

export async function clearStoredGatewayToken(settings: GatewaySettings): Promise<GatewaySettings> {
  const nextSettings: GatewaySettings = {
    ...settings,
    token: undefined,
    tokenSavedAt: undefined
  };

  await saveGatewaySettings(nextSettings);
  return nextSettings;
}


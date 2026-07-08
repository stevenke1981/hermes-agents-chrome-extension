import { describe, expect, it } from 'vitest';

import { createDiagnosticsPayload, detectBrowserFamily } from '../src/shared/diagnostics';

describe('diagnostics payload', () => {
  it('includes safe runtime metadata and excludes sensitive browser content', () => {
    const payload = createDiagnosticsPayload({
      extensionVersion: '0.1.0',
      browser: 'chrome',
      gatewayUrl: 'https://gateway.example.com/api?token=secret',
      mode: 'remote_api',
      connectionState: 'connected_with_warning',
      capabilities: { flags: { chat: true, tools: false } },
      contextScope: 'follow_active_tab',
      lastVisibleErrorCategory: 'capability_missing',
      redactionCounts: { bearer: 1, jwt: 2 },
      forbiddenDebugFields: {
        token: 'secret-token',
        cookie: 'session=secret',
        pageText: 'sensitive page text',
        selectedText: 'sensitive selected text',
        fullTabUrl: 'https://example.com/path?token=secret',
        tabTitle: 'Secret Dashboard'
      }
    });

    const serialized = JSON.stringify(payload);

    expect(payload).toMatchObject({
      extensionVersion: '0.1.0',
      browser: 'chrome',
      gatewayOrigin: 'https://gateway.example.com',
      mode: 'remote_api',
      connectionState: 'connected_with_warning',
      contextScope: 'follow_active_tab',
      lastVisibleErrorCategory: 'capability_missing',
      redactionCounts: { bearer: 1, jwt: 2 }
    });
    expect(payload.capabilityFlags).toEqual({ chat: true, tools: false });
    expect(serialized).not.toContain('secret-token');
    expect(serialized).not.toContain('session=secret');
    expect(serialized).not.toContain('sensitive page text');
    expect(serialized).not.toContain('sensitive selected text');
    expect(serialized).not.toContain('/path?token=secret');
    expect(serialized).not.toContain('Secret Dashboard');
  });
});

describe('browser family detection', () => {
  it('detects Chromium browser families from user agent and client hints', () => {
    expect(detectBrowserFamily('Mozilla/5.0 Edg/126.0', [])).toBe('edge');
    expect(detectBrowserFamily('Mozilla/5.0 Chrome/126.0', [{ brand: 'Brave', version: '126' }])).toBe('brave');
    expect(detectBrowserFamily('Mozilla/5.0 Chrome/126.0', [{ brand: 'Chromium', version: '126' }])).toBe('chromium');
    expect(detectBrowserFamily('Mozilla/5.0 Chrome/126.0', [])).toBe('chrome');
  });
});

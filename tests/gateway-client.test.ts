import { afterEach, describe, expect, it, vi } from 'vitest';

import {
  createHermesRestClient,
  getGatewayOrigin,
  getRemoteGatewayWarning,
  probeGateway,
  redactSensitiveText
} from '../src/gateway/rest-adapter';
import type { GatewaySettings } from '../src/shared/types';

const settings: GatewaySettings = {
  mode: 'local_api',
  gatewayUrl: 'http://127.0.0.1:8642',
  token: 'secret-token',
  allowInsecureRemoteHttp: false
};

afterEach(() => {
  vi.unstubAllGlobals();
});

describe('Hermes REST gateway adapter', () => {
  it('calls the health endpoint with a bearer token header', async () => {
    const fetchMock = vi.fn(async () => jsonResponse({ ok: true, version: '1.0.0' }));
    vi.stubGlobal('fetch', fetchMock);

    const client = createHermesRestClient(settings);
    await expect(client.health()).resolves.toMatchObject({ ok: true, version: '1.0.0' });

    expect(fetchMock).toHaveBeenCalledWith(
      new URL('http://127.0.0.1:8642/health'),
      expect.objectContaining({
        headers: expect.objectContaining({
          Authorization: 'Bearer secret-token'
        })
      })
    );
  });

  it('does not duplicate the bearer scheme when a pasted token already includes it', async () => {
    const fetchMock = vi.fn(async () => jsonResponse({ ok: true }));
    vi.stubGlobal('fetch', fetchMock);

    const client = createHermesRestClient({
      ...settings,
      token: '  Bearer pasted-token  '
    });
    await client.health();

    expect(fetchMock).toHaveBeenCalledWith(
      new URL('http://127.0.0.1:8642/health'),
      expect.objectContaining({
        headers: expect.objectContaining({
          Authorization: 'Bearer pasted-token'
        })
      })
    );
  });

  it('normalizes common list response shapes', async () => {
    vi.stubGlobal(
      'fetch',
      vi.fn(async () => jsonResponse({ data: [{ id: 'model-a' }, 'model-b'] }))
    );

    const client = createHermesRestClient(settings);
    await expect(client.listModels()).resolves.toEqual([{ id: 'model-a' }, { id: 'model-b' }]);
  });

  it('redacts token-shaped text from safe errors', async () => {
    expect(redactSensitiveText('Authorization: Bearer secret-token token=abc.def.ghi')).toBe(
      'Authorization: Bearer [REDACTED] token=[REDACTED]'
    );
    expect(redactSensitiveText('Authorization: Bearer "quoted-secret-token"')).toBe(
      'Authorization: Bearer [REDACTED]'
    );
  });

  it('returns connected_with_warning when optional catalog endpoints fail', async () => {
    vi.stubGlobal(
      'fetch',
      vi.fn(async (url: URL) => {
        if (url.pathname === '/health') {
          return jsonResponse({ ok: true });
        }

        if (url.pathname === '/v1/models') {
          return jsonResponse({ models: [{ id: 'hermes-auto' }] });
        }

        return jsonResponse({ error: 'missing' }, 404);
      })
    );

    await expect(probeGateway(settings)).resolves.toMatchObject({
      state: 'connected_with_warning',
      models: [{ id: 'hermes-auto' }],
      gatewayOrigin: 'http://127.0.0.1:8642'
    });
  });

  it('sanitizes gateway origin and warns on insecure remote HTTP', () => {
    const remoteSettings: GatewaySettings = {
      mode: 'remote_api',
      gatewayUrl: 'http://example.com:8642/path?token=secret',
      allowInsecureRemoteHttp: false
    };

    expect(getGatewayOrigin(remoteSettings)).toBe('http://example.com:8642');
    expect(getRemoteGatewayWarning(remoteSettings)).toContain('Remote HTTP gateway');
  });
});

function jsonResponse(body: unknown, status = 200): Response {
  return new Response(JSON.stringify(body), {
    status,
    headers: {
      'Content-Type': 'application/json'
    }
  });
}

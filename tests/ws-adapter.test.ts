import { describe, expect, it, vi } from 'vitest';

import { createHermesDashboardWebSocketClient } from '../src/gateway/ws-adapter';
import type { GatewaySettings } from '../src/shared/types';

const settings: GatewaySettings = {
  mode: 'remote_dashboard_ws',
  gatewayUrl: 'https://gateway.example.com/base?token=secret',
  token: 'Bearer ws-token',
  allowInsecureRemoteHttp: false
};

describe('dashboard WebSocket adapter', () => {
  it('opens a sanitized WebSocket URL and sends an auth hello message', async () => {
    const socket = new FakeWebSocket();
    const client = createHermesDashboardWebSocketClient(settings, {
      createWebSocket: (url) => {
        expect(url).toBe('wss://gateway.example.com/api/ws');
        return socket;
      }
    });

    const healthPromise = client.health();
    socket.open();

    await expect(healthPromise).resolves.toMatchObject({
      ok: true,
      status: 'dashboard_ws_ready'
    });
    expect(socket.sent.map((item) => JSON.parse(item))).toEqual([
      {
        type: 'hello',
        authorization: 'Bearer ws-token'
      }
    ]);
  });

  it('streams dashboard message events as Hermes stream events', async () => {
    const socket = new FakeWebSocket();
    const client = createHermesDashboardWebSocketClient(settings, {
      createWebSocket: () => socket
    });

    const eventsPromise = collectAsync(client.sendTurn({ message: 'Hello', model: 'auto' }));
    socket.open();
    socket.message({ type: 'delta', text: 'Hi' });
    socket.message({ type: 'done' });

    await expect(eventsPromise).resolves.toEqual([
      { type: 'delta', text: 'Hi' },
      { type: 'done' }
    ]);
    expect(socket.sent.map((item) => JSON.parse(item)).at(-1)).toMatchObject({
      type: 'turn',
      input: {
        message: 'Hello',
        model: 'auto'
      }
    });
  });
});

async function collectAsync<T>(source: AsyncIterable<T>): Promise<T[]> {
  const items: T[] = [];
  for await (const item of source) {
    items.push(item);
  }
  return items;
}

class FakeWebSocket {
  sent: string[] = [];
  onopen: ((event: Event) => void) | null = null;
  onmessage: ((event: MessageEvent<string>) => void) | null = null;
  onerror: ((event: Event) => void) | null = null;
  onclose: ((event: CloseEvent) => void) | null = null;

  send = vi.fn((payload: string) => {
    this.sent.push(payload);
  });

  close = vi.fn(() => {
    this.onclose?.(new Event('close') as CloseEvent);
  });

  open() {
    this.onopen?.(new Event('open'));
  }

  message(payload: unknown) {
    this.onmessage?.(new MessageEvent('message', { data: JSON.stringify(payload) }));
  }
}

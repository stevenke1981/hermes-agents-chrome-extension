import { describe, expect, it, vi } from 'vitest';

import { createHermesRestClient } from '../src/gateway/rest-adapter';
import type { GatewaySettings } from '../src/shared/types';

const settings: GatewaySettings = {
  mode: 'local_api',
  gatewayUrl: 'http://127.0.0.1:8642',
  token: 'secret-token',
  allowInsecureRemoteHttp: false
};

describe('chat streaming adapter', () => {
  it('posts a turn and yields streaming delta and done events', async () => {
    const fetchMock = vi.fn(async () => streamResponse(['data: {"choices":[{"delta":{"content":"Hi"}}]}', 'data: [DONE]']));
    vi.stubGlobal('fetch', fetchMock);

    const client = createHermesRestClient(settings);
    const events = [];
    for await (const event of client.sendTurn({
      message: 'Hello',
      model: 'hermes-auto',
      context: 'UNTRUSTED_BROWSER_CONTEXT_START\n{}\nUNTRUSTED_BROWSER_CONTEXT_END'
    })) {
      events.push(event);
    }

    expect(fetchMock).toHaveBeenCalledWith(
      new URL('http://127.0.0.1:8642/v1/chat/completions'),
      expect.objectContaining({
        method: 'POST',
        headers: expect.objectContaining({
          Authorization: 'Bearer secret-token'
        })
      })
    );
    expect(events).toEqual([{ type: 'delta', text: 'Hi' }, { type: 'done' }]);
  });
});

function streamResponse(lines: string[]): Response {
  const body = new ReadableStream({
    start(controller) {
      const encoder = new TextEncoder();
      controller.enqueue(encoder.encode(`${lines.join('\n')}\n`));
      controller.close();
    }
  });

  return new Response(body, {
    status: 200,
    headers: { 'Content-Type': 'text/event-stream' }
  });
}

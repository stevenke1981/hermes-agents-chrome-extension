import { describe, expect, it } from 'vitest';

import { parseHermesStreamChunk } from '../src/gateway/stream-parser';

describe('Hermes stream parser', () => {
  it('parses OpenAI-compatible delta chunks', () => {
    expect(
      parseHermesStreamChunk('data: {"choices":[{"delta":{"content":"Hello"}}]}')
    ).toEqual({ type: 'delta', text: 'Hello' });
  });

  it('parses tool activity chunks', () => {
    expect(parseHermesStreamChunk('data: {"type":"tool","name":"search_docs","status":"done"}')).toEqual({
      type: 'tool',
      name: 'search_docs',
      status: 'done'
    });
  });

  it('parses done chunks and ignores keepalive lines', () => {
    expect(parseHermesStreamChunk('data: [DONE]')).toEqual({ type: 'done' });
    expect(parseHermesStreamChunk(': ping')).toBeUndefined();
  });
});

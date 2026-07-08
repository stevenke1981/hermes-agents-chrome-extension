import { afterEach, describe, expect, it, vi } from 'vitest';

import { extractContextFromActiveTab } from '../src/sidepanel/App';

describe('side panel active tab context extraction', () => {
  afterEach(() => {
    vi.useRealTimers();
  });

  it('returns undefined when the content script message does not answer before timeout', async () => {
    vi.useFakeTimers();

    const result = extractContextFromActiveTab('follow_active_tab', {
      timeoutMs: 5,
      tabs: {
        query: vi.fn(async () => [{ id: 42 }]),
        sendMessage: vi.fn(() => new Promise<never>(() => undefined))
      }
    });

    await vi.advanceTimersByTimeAsync(5);

    await expect(result).resolves.toBeUndefined();
  });
});

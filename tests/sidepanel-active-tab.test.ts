import { afterEach, describe, expect, it, vi } from 'vitest';

import { extractContextFromActiveTab } from '../src/sidepanel/App';
import { buildBrowserContext, createContextReceipt } from '../src/shared/browser-context-protocol';

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

  it('keeps open tabs summary disabled by default', async () => {
    const context = buildBrowserContext({
      scope: 'follow_active_tab',
      source: { browser: 'chrome', extensionVersion: '0.1.0' },
      page: { text: 'Page text' }
    });
    const query = vi.fn(async () => [{ id: 42 }]);

    const result = await extractContextFromActiveTab('follow_active_tab', {
      tabs: {
        query,
        sendMessage: vi.fn(async () => ({ context, receipt: createContextReceipt(context) }))
      }
    });

    expect(result?.context.openTabs).toBeUndefined();
    expect(result?.receipt.openTabsSent).toBe(0);
    expect(query).toHaveBeenCalledTimes(1);
  });

  it('adds a safe open tabs summary only when requested', async () => {
    const context = buildBrowserContext({
      scope: 'follow_active_tab',
      source: { browser: 'chrome', extensionVersion: '0.1.0' },
      page: { text: 'Page text' }
    });

    const result = await extractContextFromActiveTab('follow_active_tab', {
      includeOpenTabs: true,
      tabs: {
        query: vi
          .fn()
          .mockResolvedValueOnce([{ id: 42 }])
          .mockResolvedValueOnce([
            { id: 42, url: 'https://example.com/private/path?token=secret', title: 'Active', windowId: 1 },
            { id: 43, url: 'https://docs.example/help', title: 'Authorization: Bearer title-secret', windowId: 1 },
            { id: 45, url: 'https://checkout.example.com/payment', title: 'Checkout', windowId: 1 },
            { id: 44, url: 'chrome://extensions', title: 'Extensions', windowId: 1 }
          ]),
        sendMessage: vi.fn(async () => ({ context, receipt: createContextReceipt(context) }))
      }
    });

    expect(result?.context.openTabs).toEqual([
      { origin: 'https://example.com', title: 'Active', tabId: 42, windowId: 1 },
      {
        origin: 'https://docs.example',
        title: 'Authorization: Bearer [REDACTED_BEARER]',
        tabId: 43,
        windowId: 1
      }
    ]);
    expect(result?.receipt.openTabsSent).toBe(2);
    expect(JSON.stringify(result)).not.toContain('token=secret');
    expect(JSON.stringify(result)).not.toContain('title-secret');
    expect(JSON.stringify(result)).not.toContain('checkout.example.com');
  });
});

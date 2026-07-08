import { describe, expect, it } from 'vitest';

import { buildContextFromPageWithTimeout } from '../src/content/context-builder';

describe('content context timeout protection', () => {
  it('returns a minimal read-only context when page extraction times out', async () => {
    const result = await buildContextFromPageWithTimeout({
      scope: 'follow_active_tab',
      href: 'https://example.com/docs',
      origin: 'https://example.com',
      title: 'Example',
      selectedText: '',
      source: { browser: 'chrome', extensionVersion: '0.1.0' },
      timeoutMs: 1,
      extractPage: () => new Promise(() => undefined)
    });

    expect(result.context.activeTab?.origin).toBe('https://example.com');
    expect(result.context.page?.text).toBe('');
    expect(result.receipt.browserContentSent).toBe(false);
  });
});


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

  it('redacts timeout fallback title before building minimal context', async () => {
    const result = await buildContextFromPageWithTimeout({
      scope: 'follow_active_tab',
      href: 'https://example.com/docs',
      origin: 'https://example.com',
      title: 'Authorization: Bearer secret-token',
      source: { browser: 'chrome', extensionVersion: '0.1.0' },
      timeoutMs: 1,
      extractPage: () => new Promise(() => undefined)
    });

    expect(result.context.activeTab?.title).toBe('Authorization: Bearer [REDACTED_BEARER]');
    expect(result.context.page?.title).toBe('Authorization: Bearer [REDACTED_BEARER]');
    expect(JSON.stringify(result.context)).not.toContain('secret-token');
    expect(result.receipt.browserContentSent).toBe(false);
  });

  it('does not include page fallback content for selected_text_only timeout', async () => {
    const result = await buildContextFromPageWithTimeout({
      scope: 'selected_text_only',
      href: 'https://example.com/docs',
      origin: 'https://example.com',
      title: 'Page title',
      selectedText: 'OPENAI_API_KEY=sk-selected-secret',
      source: { browser: 'chrome', extensionVersion: '0.1.0' },
      timeoutMs: 1,
      extractPage: () => new Promise(() => undefined)
    });

    expect(result.context.page).toBeUndefined();
    expect(result.context.activeTab).toEqual({ origin: 'https://example.com' });
    expect(result.context.selectedText?.text).toContain('[REDACTED_SECRET_ASSIGNMENT]');
    expect(JSON.stringify(result.context)).not.toContain('Page title');
    expect(JSON.stringify(result.context)).not.toContain('sk-selected-secret');
  });
});

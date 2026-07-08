import { describe, expect, it } from 'vitest';

import { redactBrowserContextInput, redactText } from '../src/content/redaction';

describe('secret redaction pipeline', () => {
  const cases: Array<[string, string]> = [
    ['Authorization: Bearer abc123SECRET', '[REDACTED_BEARER]'],
    ['Authorization: Bearer "quoted-secret-token"', 'Authorization: Bearer [REDACTED_BEARER]'],
    ['OPENAI_API_KEY=sk-1234567890abcdef', '[REDACTED_SECRET_ASSIGNMENT]'],
    ['ANTHROPIC_API_KEY=sk-ant-abc123456789', '[REDACTED_SECRET_ASSIGNMENT]'],
    ['GOOGLE_API_KEY=AIzaSyA123456789012345678901234567890', '[REDACTED_API_KEY]'],
    ['GITHUB_TOKEN=ghp_1234567890abcdefghijklmnopqrstuvwxyz', '[REDACTED_SECRET_ASSIGNMENT]'],
    ['SLACK_TOKEN=xoxb-123456789012-123456789012-secret', '[REDACTED_SECRET_ASSIGNMENT]'],
    ['github token ghp_1234567890abcdefghijklmnopqrstuvwxyz', '[REDACTED_API_KEY]'],
    ['github fine token github_pat_1234567890_abcdefghijklmnopqrstuvwxyz', '[REDACTED_API_KEY]'],
    ['slack bot xoxb-123456789012-123456789012-secret', '[REDACTED_API_KEY]'],
    ['slack user xoxp-123456789012-123456789012-secret', '[REDACTED_API_KEY]'],
    ['jwt aaa.bbb.ccc', '[REDACTED_JWT]'],
    ['-----BEGIN PRIVATE KEY-----\nsecret\n-----END PRIVATE KEY-----', '[REDACTED_PRIVATE_KEY]'],
    ['API_KEY=abc123', '[REDACTED_SECRET_ASSIGNMENT]'],
    ['TOKEN=abc123', '[REDACTED_SECRET_ASSIGNMENT]'],
    ['SECRET=abc123', '[REDACTED_SECRET_ASSIGNMENT]'],
    ['PASSWORD=abc123', '[REDACTED_SECRET_ASSIGNMENT]'],
    ['https://example.com?token=abc&x=1', 'token=[REDACTED]'],
    ['https://example.com?api_key=abc&x=1', 'api_key=[REDACTED]'],
    ['session=abcdef1234567890', '[REDACTED_COOKIE]'],
    ['sid=abcdef1234567890', '[REDACTED_COOKIE]']
  ];

  it.each(cases)('redacts %s', (input, marker) => {
    const result = redactText(input, 'page_text');

    expect(result.text).toContain(marker);
    expect(result.text).not.toContain('abc123SECRET');
    expect(result.events.length).toBeGreaterThan(0);
  });

  it('tracks redaction counts by location', () => {
    const result = redactBrowserContextInput({
      activeTab: { origin: 'https://example.com?token=secret', title: 'Bearer titleSecret' },
      selectedText: 'OPENAI_API_KEY=sk-selected-secret',
      page: { title: 'Page', text: 'session=secret TOKEN=pageSecret' }
    });

    expect(result.redactions.map((event) => event.location)).toEqual(
      expect.arrayContaining(['url', 'tab_title', 'selected_text', 'page_text'])
    );
    expect(result.activeTab?.origin).toBe('https://example.com?token=[REDACTED]');
    expect(result.selectedText).toContain('[REDACTED_SECRET_ASSIGNMENT]');
    expect(result.page?.text).toContain('[REDACTED_COOKIE]');
  });
});

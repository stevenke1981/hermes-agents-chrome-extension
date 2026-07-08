import { describe, expect, it } from 'vitest';

import { handleHermesContentRequest } from '../src/content/content';

describe('content script message handler', () => {
  it('serves explicit YouTube transcript extraction requests', async () => {
    const response = await handleHermesContentRequest(
      { type: 'HERMES_EXTRACT_YOUTUBE_TRANSCRIPT' },
      {
        href: 'https://www.youtube.com/watch?v=abc123',
        origin: 'https://www.youtube.com',
        title: 'Video',
        selectedText: '',
        source: { browser: 'chrome', extensionVersion: '0.1.0' },
        root: {
          querySelectorAll(selector: string) {
            if (selector === 'ytd-transcript-segment-renderer, [data-testid="transcript-segment"], .segment-text') {
              return [{ textContent: 'Transcript line' }];
            }
            return [];
          }
        }
      }
    );

    expect(response).toEqual({
      ok: true,
      readOnly: true,
      transcript: {
        available: true,
        text: 'Transcript line'
      }
    });
  });
});

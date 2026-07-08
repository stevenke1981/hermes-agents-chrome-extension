import { describe, expect, it } from 'vitest';

import { getYouTubeTranscriptContext } from '../src/content/youtube-transcript';

describe('YouTube transcript adapter stub', () => {
  it('is disabled by default and does not synthesize transcript text', async () => {
    await expect(getYouTubeTranscriptContext()).resolves.toEqual({
      available: false,
      text: undefined
    });
  });

  it('extracts visible YouTube transcript segments when explicitly enabled', async () => {
    const root = {
      querySelectorAll(selector: string) {
        if (selector === 'ytd-transcript-segment-renderer, [data-testid="transcript-segment"], .segment-text') {
          return [
            { textContent: '  First line  ' },
            { textContent: 'Second line' }
          ];
        }
        return [];
      }
    };

    await expect(getYouTubeTranscriptContext({ enabled: true, root })).resolves.toEqual({
      available: true,
      text: 'First line\nSecond line'
    });
  });
});

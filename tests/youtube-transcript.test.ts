import { describe, expect, it } from 'vitest';

import { getYouTubeTranscriptContext } from '../src/content/youtube-transcript';

describe('YouTube transcript adapter stub', () => {
  it('is disabled by default and does not synthesize transcript text', async () => {
    await expect(getYouTubeTranscriptContext()).resolves.toEqual({
      available: false,
      text: undefined
    });
  });
});

export interface YouTubeTranscriptContext {
  available: boolean;
  text?: string;
}

interface TranscriptRoot {
  querySelectorAll: (selector: string) => Iterable<{ textContent?: string | null }> | ArrayLike<{ textContent?: string | null }>;
}

interface YouTubeTranscriptOptions {
  enabled?: boolean;
  root?: TranscriptRoot;
}

const TRANSCRIPT_SEGMENT_SELECTOR =
  'ytd-transcript-segment-renderer, [data-testid="transcript-segment"], .segment-text';

export async function getYouTubeTranscriptContext(
  options: YouTubeTranscriptOptions = {}
): Promise<YouTubeTranscriptContext> {
  if (!options.enabled) {
    return {
      available: false,
      text: undefined
    };
  }

  const root = options.root ?? document;
  const text = Array.from(root.querySelectorAll(TRANSCRIPT_SEGMENT_SELECTOR))
    .map((element) => cleanText(element.textContent ?? ''))
    .filter(Boolean)
    .join('\n');

  return {
    available: Boolean(text),
    text: text || undefined
  };
}

function cleanText(value: string): string {
  return value.replace(/\s+/g, ' ').trim();
}

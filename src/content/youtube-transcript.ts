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
  const text = extractVisibleTranscript(root) || extractScriptTranscript(root);

  return {
    available: Boolean(text),
    text: text || undefined
};
}

function extractVisibleTranscript(root: TranscriptRoot): string {
  return Array.from(root.querySelectorAll(TRANSCRIPT_SEGMENT_SELECTOR))
    .map((element) => cleanText(element.textContent ?? ''))
    .filter(Boolean)
    .join('\n');
}

function extractScriptTranscript(root: TranscriptRoot): string {
  return Array.from(root.querySelectorAll('script'))
    .map((element) => element.textContent ?? '')
    .map(extractCueTextFromScript)
    .find(Boolean) ?? '';
}

function extractCueTextFromScript(scriptText: string): string {
  const match = scriptText.match(/"transcript"\s*:\s*\{\s*"cues"\s*:\s*(\[[\s\S]*?\])\s*\}/);
  if (!match) {
    return '';
  }

  try {
    const cues = JSON.parse(match[1]) as unknown;
    if (!Array.isArray(cues)) {
      return '';
    }

    return cues
      .flatMap((cue) => isCue(cue) ? [cleanText(cue.text)] : [])
      .filter(Boolean)
      .join('\n');
  } catch {
    return '';
  }
}

function isCue(value: unknown): value is { text: string } {
  return typeof value === 'object' && value !== null && 'text' in value && typeof value.text === 'string';
}

function cleanText(value: string): string {
  return value.replace(/\s+/g, ' ').trim();
}

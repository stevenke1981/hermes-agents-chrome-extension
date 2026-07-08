export interface YouTubeTranscriptContext {
  available: boolean;
  text?: string;
}

export async function getYouTubeTranscriptContext(): Promise<YouTubeTranscriptContext> {
  return {
    available: false,
    text: undefined
  };
}

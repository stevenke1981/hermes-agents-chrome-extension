import { extractPageContext } from './extractors';
import { redactBrowserContextInput } from './redaction';
import {
  createBlockedBrowserContextWithSecureHash,
  isRestrictedPage
} from './restricted-pages';
import { getYouTubeTranscriptContext } from './youtube-transcript';
import { buildBrowserContext, createContextReceipt } from '../shared/browser-context-protocol';
import type { BrowserContextReceipt, BrowserContextV1, ContextScope } from '../shared/types';

type ExtractPage = () => ReturnType<typeof extractPageContext> | Promise<ReturnType<typeof extractPageContext>>;

interface BuildContextFromPageInput {
  scope: ContextScope;
  href: string;
  origin: string;
  title: string;
  selectedText?: string;
  source: BrowserContextV1['source'];
  maxChars?: number;
  timeoutMs?: number;
  root?: Document;
  extractPage?: ExtractPage;
}

export async function buildContextFromPageWithTimeout(
  input: BuildContextFromPageInput
): Promise<{ context: BrowserContextV1; receipt: BrowserContextReceipt }> {
  const timeoutMs = input.timeoutMs ?? 1_200;
  const context = await withTimeout(buildContextFromPage(input), timeoutMs, () =>
    buildMinimalTimedOutContext(input)
  );

  return {
    context,
    receipt: createContextReceipt(context)
  };
}

async function buildContextFromPage(input: BuildContextFromPageInput): Promise<BrowserContextV1> {
  const restricted = isRestrictedPage(input.href);
  if (restricted.blocked) {
    return createBlockedBrowserContextWithSecureHash({
      url: input.href,
      scope: input.scope,
      source: input.source
    });
  }

  if (input.scope === 'selected_text_only') {
    const redacted = redactBrowserContextInput({
      activeTab: {
        origin: input.origin,
        title: input.title
      },
      selectedText: input.selectedText
    });

    return buildBrowserContext({
      scope: input.scope,
      source: input.source,
      activeTab: redacted.activeTab,
      selectedText: redacted.selectedText,
      redactions: redacted.redactions,
      maxChars: input.maxChars
    });
  }

  const page = await (input.extractPage?.() ?? extractPageContext(input.root ?? document));
  const transcript = await getYouTubeTranscriptContext({
    enabled: input.href.includes('youtube.com/watch') || input.href.includes('youtu.be/'),
    root: input.root ?? document
  });
  const text = transcript.available && transcript.text
    ? `${page.text}\n\nYouTube transcript:\n${transcript.text}`.trim()
    : page.text;
  const redacted = redactBrowserContextInput({
    activeTab: {
      origin: input.origin,
      title: input.title
    },
    selectedText: input.selectedText,
    page: {
      ...page,
      text
    }
  });

  return buildBrowserContext({
    scope: input.scope,
    source: input.source,
    activeTab: redacted.activeTab,
    selectedText: redacted.selectedText,
    page: redacted.page,
    redactions: redacted.redactions,
    maxChars: input.maxChars
  });
}

function buildMinimalTimedOutContext(input: BuildContextFromPageInput): BrowserContextV1 {
  const redacted = redactBrowserContextInput({
    activeTab: {
      origin: input.origin,
      title: input.title
    },
    selectedText: input.scope === 'selected_text_only' ? input.selectedText : undefined,
    page: input.scope === 'selected_text_only'
      ? undefined
      : {
          title: input.title,
          text: ''
        }
  });

  return buildBrowserContext({
    scope: input.scope,
    source: input.source,
    activeTab: redacted.activeTab,
    selectedText: redacted.selectedText,
    page: redacted.page,
    redactions: redacted.redactions,
    maxChars: input.maxChars
  });
}

async function withTimeout<T>(
  promise: Promise<T>,
  timeoutMs: number,
  fallback: () => T
): Promise<T> {
  let timeoutId: ReturnType<typeof setTimeout> | undefined;
  try {
    return await Promise.race([
      promise,
      new Promise<T>((resolve) => {
        timeoutId = setTimeout(() => resolve(fallback()), timeoutMs);
      })
    ]);
  } finally {
    if (timeoutId) {
      clearTimeout(timeoutId);
    }
  }
}

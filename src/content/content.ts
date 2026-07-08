import { buildContextFromPageWithTimeout } from './context-builder';
import {
  getYouTubeTranscriptContext,
  type TranscriptRoot,
  type YouTubeTranscriptContext
} from './youtube-transcript';
import { EXTENSION_VERSION } from '../shared/constants';
import { detectBrowserFamily } from '../shared/diagnostics';
import type { BrowserContextReceipt, BrowserContextV1, ContextScope } from '../shared/types';

type HermesContentRequest = {
  type:
    | 'HERMES_CONTENT_SCAFFOLD_STATUS'
    | 'HERMES_EXTRACT_CONTEXT'
    | 'HERMES_EXTRACT_YOUTUBE_TRANSCRIPT';
  scope?: ContextScope;
  maxChars?: number;
};

type HermesContentResponse =
  | {
  ok: true;
  readOnly: true;
  browserContentSent: false;
}
  | {
      ok: true;
      readOnly: true;
      context: BrowserContextV1;
      receipt: BrowserContextReceipt;
    }
  | {
      ok: true;
      readOnly: true;
      transcript: YouTubeTranscriptContext;
    };

interface ContentHandlerEnvironment {
  href: string;
  origin: string;
  title: string;
  selectedText?: string;
  source: BrowserContextV1['source'];
  root?: Document | TranscriptRoot;
}

export function handleHermesContentRequest(
  message: HermesContentRequest,
  environment: ContentHandlerEnvironment = getBrowserEnvironment()
): Promise<HermesContentResponse | undefined> | HermesContentResponse | undefined {
  if (message?.type === 'HERMES_CONTENT_SCAFFOLD_STATUS') {
    return {
      ok: true,
      readOnly: true,
      browserContentSent: false
    };
  }

  if (message?.type === 'HERMES_EXTRACT_CONTEXT') {
    return buildContextFromPageWithTimeout({
      scope: message.scope ?? 'follow_active_tab',
      href: environment.href,
      origin: environment.origin,
      title: environment.title,
      selectedText: environment.selectedText,
      source: environment.source,
      maxChars: message.maxChars,
      root: environment.root as Document | undefined
    }).then(({ context, receipt }) => ({
      ok: true,
      readOnly: true,
      context,
      receipt
    }));
  }

  if (message?.type === 'HERMES_EXTRACT_YOUTUBE_TRANSCRIPT') {
    return getYouTubeTranscriptContext({
      enabled: isYouTubeWatchUrl(environment.href),
      root: environment.root
    }).then((transcript) => ({
      ok: true,
      readOnly: true,
      transcript
    }));
  }

  return undefined;
}

if (typeof chrome !== 'undefined' && chrome.runtime?.onMessage) {
  chrome.runtime.onMessage.addListener(
  (
    message: HermesContentRequest,
    _sender: chrome.runtime.MessageSender,
    sendResponse: (response: HermesContentResponse) => void
  ) => {
    const response = handleHermesContentRequest(message);
    if (!response) {
      return false;
    }

    void Promise.resolve(response).then((resolved) => {
      if (resolved) {
        sendResponse(resolved);
      }
    });
    return true;
  }
);
}

function getBrowserEnvironment(): ContentHandlerEnvironment {
  return {
    href: window.location.href,
    origin: window.location.origin,
    title: document.title,
    selectedText: window.getSelection()?.toString() ?? undefined,
    source: {
      browser: detectBrowserFamily(navigator.userAgent, getNavigatorBrands()),
      extensionVersion: EXTENSION_VERSION
    },
    root: document
  };
}

function isYouTubeWatchUrl(href: string): boolean {
  return href.includes('youtube.com/watch') || href.includes('youtu.be/');
}

function getNavigatorBrands(): Array<{ brand: string; version?: string }> {
  const navigatorWithHints = navigator as Navigator & {
    userAgentData?: { brands?: Array<{ brand: string; version?: string }> };
  };
  return navigatorWithHints.userAgentData?.brands ?? [];
}

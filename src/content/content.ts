import { extractPageContext } from './extractors';
import { redactBrowserContextInput } from './redaction';
import { createBlockedBrowserContext, isRestrictedPage } from './restricted-pages';
import { buildBrowserContext, createContextReceipt } from '../shared/browser-context-protocol';
import { EXTENSION_VERSION } from '../shared/constants';
import type { BrowserContextReceipt, BrowserContextV1, ContextScope } from '../shared/types';

type HermesContentRequest = {
  type: 'HERMES_CONTENT_SCAFFOLD_STATUS' | 'HERMES_EXTRACT_CONTEXT';
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
    };

chrome.runtime.onMessage.addListener(
  (
    message: HermesContentRequest,
    _sender: chrome.runtime.MessageSender,
    sendResponse: (response: HermesContentResponse) => void
  ) => {
    if (message?.type !== 'HERMES_CONTENT_SCAFFOLD_STATUS') {
      if (message?.type === 'HERMES_EXTRACT_CONTEXT') {
        const scope = message.scope ?? 'follow_active_tab';
        const restricted = isRestrictedPage(window.location.href);
        const context = restricted.blocked
          ? createBlockedBrowserContext({
              url: window.location.href,
              scope,
              source: {
                browser: 'unknown',
                extensionVersion: EXTENSION_VERSION
              }
            })
          : buildSafeContext(scope, message.maxChars);

        sendResponse({
          ok: true,
          readOnly: true,
          context,
          receipt: createContextReceipt(context)
        });

        return true;
      }

      return false;
    }

    sendResponse({
      ok: true,
      readOnly: true,
      browserContentSent: false
    });

    return true;
  }
);

function buildSafeContext(scope: ContextScope, maxChars?: number): BrowserContextV1 {
  const redacted = redactBrowserContextInput({
    activeTab: {
      origin: window.location.origin,
      title: document.title
    },
    selectedText: window.getSelection()?.toString() ?? undefined,
    page: extractPageContext(document)
  });

  return buildBrowserContext({
    scope,
    source: {
      browser: 'unknown',
      extensionVersion: EXTENSION_VERSION
    },
    activeTab: redacted.activeTab,
    selectedText: redacted.selectedText,
    page: redacted.page,
    redactions: redacted.redactions,
    maxChars
  });
}


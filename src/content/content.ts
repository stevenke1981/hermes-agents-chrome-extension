import { buildContextFromPageWithTimeout } from './context-builder';
import { EXTENSION_VERSION } from '../shared/constants';
import { detectBrowserFamily } from '../shared/diagnostics';
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
        void buildContextFromPageWithTimeout({
          scope: message.scope ?? 'follow_active_tab',
          href: window.location.href,
          origin: window.location.origin,
          title: document.title,
          selectedText: window.getSelection()?.toString() ?? undefined,
          source: {
            browser: detectBrowserFamily(navigator.userAgent, getNavigatorBrands()),
            extensionVersion: EXTENSION_VERSION
          },
          maxChars: message.maxChars
        }).then(({ context, receipt }) => {
          sendResponse({
            ok: true,
            readOnly: true,
            context,
            receipt
          });
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

function getNavigatorBrands(): Array<{ brand: string; version?: string }> {
  const navigatorWithHints = navigator as Navigator & {
    userAgentData?: { brands?: Array<{ brand: string; version?: string }> };
  };
  return navigatorWithHints.userAgentData?.brands ?? [];
}

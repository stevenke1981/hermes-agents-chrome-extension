import { extractPageContext } from './extractors';
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
        const context = buildBrowserContext({
          scope: message.scope ?? 'follow_active_tab',
          source: {
            browser: 'unknown',
            extensionVersion: EXTENSION_VERSION
          },
          activeTab: {
            origin: window.location.origin,
            title: document.title
          },
          selectedText: window.getSelection()?.toString() ?? undefined,
          page: extractPageContext(document),
          maxChars: message.maxChars
        });

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


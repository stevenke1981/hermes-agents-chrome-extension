type HermesContentRequest = {
  type: 'HERMES_CONTENT_SCAFFOLD_STATUS';
};

type HermesContentResponse = {
  ok: true;
  readOnly: true;
  browserContentSent: false;
};

chrome.runtime.onMessage.addListener(
  (
    message: HermesContentRequest,
    _sender: chrome.runtime.MessageSender,
    sendResponse: (response: HermesContentResponse) => void
  ) => {
    if (message?.type !== 'HERMES_CONTENT_SCAFFOLD_STATUS') {
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


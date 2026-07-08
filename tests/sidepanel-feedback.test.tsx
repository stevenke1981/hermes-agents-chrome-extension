import { renderToStaticMarkup } from 'react-dom/server';
import { afterEach, describe, expect, it, vi } from 'vitest';

import {
  CONTEXT_EXTRACTION_UNAVAILABLE_MESSAGE,
  SendButtonContent,
  isAgentModeSelected,
  scheduleDiagnosticsCopiedReset
} from '../src/sidepanel/App';

describe('side panel feedback helpers', () => {
  afterEach(() => {
    vi.useRealTimers();
  });

  it('resets diagnostics copied state after the configured delay', async () => {
    vi.useFakeTimers();
    const setCopied = vi.fn();

    scheduleDiagnosticsCopiedReset(setCopied, 5);
    await vi.advanceTimersByTimeAsync(5);

    expect(setCopied).toHaveBeenCalledWith(false);
  });

  it('renders a spinner in the send button while streaming', () => {
    const html = renderToStaticMarkup(<SendButtonContent isStreaming />);

    expect(html).toContain('send-spinner');
    expect(html).toContain('Streaming...');
  });

  it('selects the active agent mode from state instead of a hard-coded default', () => {
    expect(isAgentModeSelected('qa_check', 'qa_check')).toBe(true);
    expect(isAgentModeSelected('general_chat', 'qa_check')).toBe(false);
  });

  it('keeps a user-facing message for pages where content scripts cannot load', () => {
    expect(CONTEXT_EXTRACTION_UNAVAILABLE_MESSAGE).toContain('chrome://');
    expect(CONTEXT_EXTRACTION_UNAVAILABLE_MESSAGE).toContain('chat-only fallback');
  });
});

import { renderToStaticMarkup } from 'react-dom/server';
import { afterEach, describe, expect, it, vi } from 'vitest';

import {
  SendButtonContent,
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
});

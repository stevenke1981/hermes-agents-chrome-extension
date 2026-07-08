import { renderToStaticMarkup } from 'react-dom/server';
import { describe, expect, it } from 'vitest';

import { App } from '../src/sidepanel/App';

describe('Phase 4 side panel workspace UI', () => {
  it('renders the core agent workspace regions', () => {
    const html = renderToStaticMarkup(<App />);

    expect(html).toContain('Hermes Agents');
    expect(html).toContain('Connection');
    expect(html).toContain('Context');
    expect(html).toContain('Agent mode');
    expect(html).toContain('Conversation');
    expect(html).toContain('Tool activity');
    expect(html).toContain('What Hermes saw');
    expect(html).toContain('Diagnostics');
  });

  it('renders Dev Handoff copy actions without direct filesystem access', () => {
    const html = renderToStaticMarkup(<App />);

    expect(html).toContain('Copy as plan.md');
    expect(html).toContain('Copy as spec.md');
    expect(html).toContain('Copy as todos.md');
    expect(html).toContain('Copy prompt for Codex');
    expect(html).toContain('Copy prompt for OpenCode');
    expect(html).not.toContain('Write to repo');
  });
});

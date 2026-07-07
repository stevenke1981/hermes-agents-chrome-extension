import { AGENT_MODES, CONTEXT_SCOPES, EXTENSION_NAME } from '../shared/constants';
import { DEFAULT_GATEWAY_SETTINGS } from '../shared/storage';
import type { AgentMode, ContextScope } from '../shared/types';

const agentLabels: Record<AgentMode, string> = {
  general_chat: 'Chat',
  summarize_page: 'Summary',
  explain_page: 'Explain',
  rewrite_selection: 'Rewrite',
  action_items: 'Tasks',
  dev_handoff: 'Dev',
  qa_check: 'QA',
  security_review: 'Security'
};

const scopeLabels: Record<ContextScope, string> = {
  chat_only: 'Chat only',
  follow_active_tab: 'Follow active tab',
  pinned_tab: 'Pinned tab',
  page_only: 'Page only',
  selected_text_only: 'Selected text only'
};

export function App() {
  return (
    <main className="shell" aria-label="Hermes Agents side panel">
      <header className="topbar">
        <div>
          <span className="product-mark" aria-hidden="true" />
          <h1>{EXTENSION_NAME}</h1>
        </div>
        <button className="status-chip" type="button" aria-label="Connection settings">
          Disconnected
        </button>
      </header>

      <section className="connection" aria-labelledby="connection-title">
        <div>
          <h2 id="connection-title">Connection</h2>
          <p>{DEFAULT_GATEWAY_SETTINGS.gatewayUrl}</p>
        </div>
        <button type="button">Test</button>
      </section>

      <section className="selectors" aria-label="Runtime selectors">
        <label>
          Model
          <select defaultValue="auto">
            <option value="auto">Hermes / auto</option>
          </select>
        </label>
        <label>
          Profile
          <select defaultValue="web">
            <option value="web">Web</option>
          </select>
        </label>
      </section>

      <section className="context-bar" aria-label="Context scope">
        <label>
          Context
          <select defaultValue="chat_only">
            {CONTEXT_SCOPES.map((scope) => (
              <option key={scope} value={scope}>
                {scopeLabels[scope]}
              </option>
            ))}
          </select>
        </label>
        <div className="context-receipt">Chat only · no browser content sent</div>
      </section>

      <section className="agent-modes" aria-label="Agent mode">
        {AGENT_MODES.map((mode) => (
          <button key={mode} type="button" className={mode === 'general_chat' ? 'selected' : ''}>
            {agentLabels[mode]}
          </button>
        ))}
      </section>

      <section className="transcript" aria-label="Conversation">
        <p className="empty-state">Connect Hermes Gateway</p>
      </section>

      <section className="receipt" aria-label="What Hermes saw">
        <h2>What Hermes saw</h2>
        <dl>
          <div>
            <dt>Scope</dt>
            <dd>Chat only</dd>
          </div>
          <div>
            <dt>Browser content sent</dt>
            <dd>No</dd>
          </div>
        </dl>
      </section>

      <form className="composer">
        <label htmlFor="message">Message</label>
        <textarea id="message" rows={3} placeholder="Ask Hermes..." />
        <button type="submit" disabled>
          Send
        </button>
      </form>
    </main>
  );
}


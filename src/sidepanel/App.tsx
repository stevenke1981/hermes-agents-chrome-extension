import { useEffect, useMemo, useState } from 'react';

import { probeGateway } from '../gateway/rest-adapter';
import { AGENT_MODES, CONTEXT_SCOPES, EXTENSION_NAME } from '../shared/constants';
import {
  clearStoredGatewayToken,
  DEFAULT_GATEWAY_SETTINGS,
  loadGatewaySettings,
  saveGatewaySettings
} from '../shared/storage';
import type {
  AgentMode,
  ConnectionState,
  ContextScope,
  GatewayMode,
  GatewayProbeResult,
  GatewaySettings
} from '../shared/types';

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

const connectionLabels: Record<ConnectionState, string> = {
  disconnected: 'Disconnected',
  connecting: 'Connecting...',
  connected: 'Connected',
  connected_with_warning: 'Connected · warning',
  fallback: 'Fallback mode',
  error: 'Connection error'
};

const gatewayModeLabels: Record<GatewayMode, string> = {
  local_api: 'Local API',
  remote_api: 'Remote API',
  remote_dashboard_ws: 'Remote dashboard WebSocket'
};

const devHandoffActions = [
  'Copy as plan.md',
  'Copy as spec.md',
  'Copy as todos.md',
  'Copy prompt for Codex',
  'Copy prompt for OpenCode'
] as const;

const emptyProbe: GatewayProbeResult = {
  state: 'error',
  models: [],
  sessions: [],
  skills: [],
  profiles: [],
  warnings: []
};

export function App() {
  const [settings, setSettings] = useState<GatewaySettings>(DEFAULT_GATEWAY_SETTINGS);
  const [tokenInput, setTokenInput] = useState('');
  const [connectionState, setConnectionState] = useState<ConnectionState>('disconnected');
  const [probeResult, setProbeResult] = useState<GatewayProbeResult>(emptyProbe);
  const [activeError, setActiveError] = useState<string | undefined>();

  useEffect(() => {
    let cancelled = false;

    void loadGatewaySettings().then((storedSettings) => {
      if (cancelled) {
        return;
      }

      setSettings(storedSettings);
      setTokenInput(storedSettings.token ? '' : '');
    });

    return () => {
      cancelled = true;
    };
  }, []);

  const canSend = connectionState === 'connected' || connectionState === 'connected_with_warning';
  const remoteWarning = useMemo(() => {
    if (settings.mode !== 'remote_api') {
      return undefined;
    }

    try {
      const url = new URL(settings.gatewayUrl);
      const localHosts = new Set(['127.0.0.1', 'localhost', '::1']);
      if (url.protocol === 'http:' && !localHosts.has(url.hostname)) {
        return 'Remote gateway warning: use trusted LAN, Tailscale/VPN, or HTTPS reverse proxy.';
      }
    } catch {
      return undefined;
    }

    return undefined;
  }, [settings.gatewayUrl, settings.mode]);

  async function handleSaveSettings(nextSettings = settings) {
    const settingsToSave: GatewaySettings = {
      ...nextSettings,
      token: tokenInput || nextSettings.token,
      tokenSavedAt: tokenInput ? new Date().toISOString() : nextSettings.tokenSavedAt
    };

    setSettings(settingsToSave);
    await saveGatewaySettings(settingsToSave);
    setTokenInput('');
  }

  async function handleTestConnection() {
    const settingsToTest: GatewaySettings = {
      ...settings,
      token: tokenInput || settings.token,
      tokenSavedAt: tokenInput ? new Date().toISOString() : settings.tokenSavedAt
    };

    setSettings(settingsToTest);
    setConnectionState('connecting');
    setActiveError(undefined);

    const result = await probeGateway(settingsToTest);
    setProbeResult(result);
    setConnectionState(result.state);
    setActiveError(result.error);

    if (result.state !== 'error') {
      await saveGatewaySettings(settingsToTest);
      setTokenInput('');
    }
  }

  async function handleClearToken() {
    const nextSettings = await clearStoredGatewayToken(settings);
    setSettings(nextSettings);
    setTokenInput('');
    setConnectionState('disconnected');
  }

  function updateSettings(partial: Partial<GatewaySettings>) {
    setSettings((current) => ({ ...current, ...partial }));
    setConnectionState('disconnected');
    setActiveError(undefined);
  }

  return (
    <main className="shell" aria-label="Hermes Agents side panel">
      <header className="topbar">
        <div>
          <span className="product-mark" aria-hidden="true" />
          <h1>{EXTENSION_NAME}</h1>
        </div>
        <button className={`status-chip ${connectionState}`} type="button" aria-label="Connection settings">
          {connectionLabels[connectionState]}
        </button>
      </header>

      <section className="connection" aria-labelledby="connection-title">
        <div className="section-heading">
          <h2 id="connection-title">Connection</h2>
          <p>{probeResult.gatewayOrigin ?? settings.gatewayUrl}</p>
        </div>
        <div className="connection-grid">
          <label>
            Mode
            <select
              value={settings.mode}
              onChange={(event) => updateSettings({ mode: event.target.value as GatewayMode })}
            >
              {Object.entries(gatewayModeLabels).map(([value, label]) => (
                <option key={value} value={value}>
                  {label}
                </option>
              ))}
            </select>
          </label>
          <label>
            Gateway URL
            <input
              value={settings.gatewayUrl}
              onChange={(event) => updateSettings({ gatewayUrl: event.target.value })}
              spellCheck={false}
            />
          </label>
          <label>
            API token
            <input
              type="password"
              value={tokenInput}
              onChange={(event) => setTokenInput(event.target.value)}
              placeholder={settings.tokenSavedAt ? 'Saved token masked' : 'Optional token'}
            />
          </label>
          <div className="connection-actions" aria-label="Connection actions">
            <button type="button" onClick={() => void handleTestConnection()} disabled={connectionState === 'connecting'}>
              Test connection
            </button>
            <button type="button" onClick={() => void handleSaveSettings()}>
              Save
            </button>
            <button type="button" onClick={() => void handleClearToken()}>
              Clear token
            </button>
          </div>
        </div>
        {remoteWarning ? <p className="warning-banner">{remoteWarning}</p> : null}
        {activeError ? <p className="error-banner">{activeError}</p> : null}
        {probeResult.warnings.length > 0 ? (
          <ul className="warning-list" aria-label="Gateway warnings">
            {probeResult.warnings.map((warning) => (
              <li key={warning}>{warning}</li>
            ))}
          </ul>
        ) : null}
      </section>

      <section className="selectors" aria-label="Runtime selectors">
        <label>
          Model
          <select defaultValue="auto">
            <option value="auto">Hermes / auto</option>
            {probeResult.models.map((model) => (
              <option key={model.id} value={model.id}>
                {model.name ?? model.id}
              </option>
            ))}
          </select>
        </label>
        <label>
          Profile
          <select defaultValue="web">
            <option value="web">Web</option>
            {probeResult.profiles.map((profile) => (
              <option key={profile.id} value={profile.id}>
                {profile.name ?? profile.id}
              </option>
            ))}
          </select>
        </label>
        <label>
          Session
          <select defaultValue="new">
            <option value="new">New session</option>
            {probeResult.sessions.map((session) => (
              <option key={session.id} value={session.id}>
                {session.title ?? session.id}
              </option>
            ))}
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
        <div className="message-list">
          <article className="message system-message">
            <p>{canSend ? 'Hermes Gateway is reachable. Chat wiring comes next.' : 'Connect Hermes Gateway'}</p>
          </article>
          <article className="message user-preview">
            <strong>User</strong>
            <p>Browser context attached only when the selected scope allows it.</p>
          </article>
          <article className="message hermes-preview">
            <strong>Hermes</strong>
            <p>Responses will stream here with markdown and tool activity.</p>
          </article>
          {probeResult.skills.length > 0 ? (
            <p className="catalog-summary">{probeResult.skills.length} skills available</p>
          ) : null}
        </div>
      </section>

      <section className="tool-activity" aria-label="Tool activity">
        <div className="section-heading">
          <h2>Tool activity</h2>
          <p>Read-only</p>
        </div>
        <ul>
          <li>browser context · waiting</li>
          <li>Hermes tools · available after gateway connection</li>
          <li>redaction · enforced before sending context</li>
        </ul>
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
          <div>
            <dt>Gateway</dt>
            <dd>{probeResult.gatewayOrigin ?? 'Not connected'}</dd>
          </div>
          <div>
            <dt>Capabilities</dt>
            <dd>{probeResult.capabilities ? Object.keys(probeResult.capabilities.flags).length : 0}</dd>
          </div>
        </dl>
      </section>

      <section className="dev-handoff" aria-label="Dev Handoff quick actions">
        <div className="section-heading">
          <h2>Dev Handoff</h2>
          <p>Clipboard only</p>
        </div>
        <div className="quick-actions">
          {devHandoffActions.map((action) => (
            <button key={action} type="button" disabled>
              {action}
            </button>
          ))}
        </div>
      </section>

      <section className="diagnostics" aria-label="Diagnostics">
        <div className="section-heading">
          <h2>Diagnostics</h2>
          <button type="button" disabled>
            Copy diagnostics
          </button>
        </div>
        <dl>
          <div>
            <dt>Connection</dt>
            <dd>{connectionLabels[connectionState]}</dd>
          </div>
          <div>
            <dt>Gateway origin</dt>
            <dd>{probeResult.gatewayOrigin ?? 'Not connected'}</dd>
          </div>
          <div>
            <dt>Context scope</dt>
            <dd>Chat only</dd>
          </div>
          <div>
            <dt>Sensitive fields</dt>
            <dd>Excluded</dd>
          </div>
        </dl>
      </section>

      <form className="composer" onSubmit={(event) => event.preventDefault()}>
        <label htmlFor="message">Message</label>
        <textarea id="message" rows={3} placeholder="Ask Hermes..." />
        <button type="submit" disabled={!canSend}>
          Send
        </button>
      </form>
    </main>
  );
}


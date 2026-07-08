import { useEffect, useMemo, useState } from 'react';

import { createHermesRestClient, probeGateway, redactSensitiveText } from '../gateway/rest-adapter';
import { wrapUntrustedBrowserContext } from '../shared/browser-context-protocol';
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
  GatewaySettings,
  BrowserContextReceipt,
  BrowserContextV1,
  HermesStreamEvent
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

type TranscriptMessage = {
  role: 'system' | 'user' | 'hermes';
  text: string;
};

type ToolActivity = Extract<HermesStreamEvent, { type: 'tool' }> | { type: 'status'; name: string; status: string };

export function App() {
  const [settings, setSettings] = useState<GatewaySettings>(DEFAULT_GATEWAY_SETTINGS);
  const [tokenInput, setTokenInput] = useState('');
  const [connectionState, setConnectionState] = useState<ConnectionState>('disconnected');
  const [probeResult, setProbeResult] = useState<GatewayProbeResult>(emptyProbe);
  const [activeError, setActiveError] = useState<string | undefined>();
  const [contextScope, setContextScope] = useState<ContextScope>('chat_only');
  const [messageText, setMessageText] = useState('');
  const [isStreaming, setIsStreaming] = useState(false);
  const [transcript, setTranscript] = useState<TranscriptMessage[]>([
    { role: 'system', text: 'Connect Hermes Gateway' },
    { role: 'user', text: 'Browser context attached only when the selected scope allows it.' },
    { role: 'hermes', text: 'Responses will stream here with markdown and tool activity.' }
  ]);
  const [toolActivity, setToolActivity] = useState<ToolActivity[]>([
    { type: 'status', name: 'browser context', status: 'waiting' },
    { type: 'status', name: 'Hermes tools', status: 'available after gateway connection' },
    { type: 'status', name: 'redaction', status: 'enforced before sending context' }
  ]);
  const [lastReceipt, setLastReceipt] = useState<BrowserContextReceipt>({
    scope: 'chat_only',
    browserContentSent: false,
    selectedTextIncluded: false,
    pageTextChars: 0,
    openTabsSent: 0,
    attachmentsSent: 0,
    redactions: 0,
    truncated: false
  });

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

  async function handleSendTurn() {
    const message = messageText.trim();
    if (!message || !canSend || isStreaming) {
      return;
    }

    setMessageText('');
    setActiveError(undefined);
    setIsStreaming(true);
    setTranscript([
      { role: 'user', text: message },
      { role: 'hermes', text: '' }
    ]);

    try {
      const context = contextScope === 'chat_only' ? undefined : await extractContextFromActiveTab(contextScope);
      if (context) {
        setLastReceipt(context.receipt);
        setToolActivity([{ type: 'status', name: 'browser context', status: 'attached' }]);
      } else {
        setLastReceipt({
          scope: 'chat_only',
          browserContentSent: false,
          selectedTextIncluded: false,
          pageTextChars: 0,
          openTabsSent: 0,
          attachmentsSent: 0,
          redactions: 0,
          truncated: false
        });
        setToolActivity([{ type: 'status', name: 'browser context', status: 'chat only' }]);
      }

      const client = createHermesRestClient(settings);
      for await (const event of client.sendTurn({
        message,
        model: probeResult.models[0]?.id,
        sessionId: probeResult.sessions[0]?.id,
        context: context ? wrapUntrustedBrowserContext(context.context) : undefined
      })) {
        applyStreamEvent(event);
      }
    } catch (error) {
      const message = error instanceof Error ? redactSensitiveText(error.message) : 'Streaming failed.';
      setActiveError(message);
      setConnectionState('connected_with_warning');
    } finally {
      setIsStreaming(false);
    }
  }

  function applyStreamEvent(event: HermesStreamEvent) {
    if (event.type === 'delta') {
      setTranscript((current) =>
        current.map((message, index) =>
          index === current.length - 1 && message.role === 'hermes'
            ? { ...message, text: `${message.text}${event.text}` }
            : message
        )
      );
      return;
    }

    if (event.type === 'tool') {
      setToolActivity((current) => [...current, event]);
      return;
    }

    if (event.type === 'error' || event.type === 'warning') {
      setToolActivity((current) => [
        ...current,
        { type: 'status', name: event.type, status: event.message }
      ]);
    }
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
          <select value={contextScope} onChange={(event) => setContextScope(event.target.value as ContextScope)}>
            {CONTEXT_SCOPES.map((scope) => (
              <option key={scope} value={scope}>
                {scopeLabels[scope]}
              </option>
            ))}
          </select>
        </label>
        <div className="context-receipt">
          {lastReceipt.blockedCategory
            ? `Blocked sensitive page · ${lastReceipt.blockedCategory}`
            : `${scopeLabels[contextScope]} · ${lastReceipt.browserContentSent ? `${lastReceipt.pageTextChars} chars` : 'no browser content sent'}`}
        </div>
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
          {transcript.map((message, index) => (
            <article key={`${message.role}-${index}`} className={`message ${message.role}-message`}>
              <strong>{message.role === 'hermes' ? 'Hermes' : message.role === 'user' ? 'User' : 'Status'}</strong>
              <p>{message.text || (isStreaming ? 'Streaming...' : '')}</p>
            </article>
          ))}
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
          {toolActivity.map((activity, index) => (
            <li key={`${activity.name}-${index}`}>
              {activity.name} · {activity.status ?? 'running'}
            </li>
          ))}
        </ul>
      </section>

      <section className="receipt" aria-label="What Hermes saw">
        <h2>What Hermes saw</h2>
        <dl>
          <div>
            <dt>Scope</dt>
            <dd>{scopeLabels[lastReceipt.scope]}</dd>
          </div>
          <div>
            <dt>Browser content sent</dt>
            <dd>{lastReceipt.browserContentSent ? 'Yes' : 'No'}</dd>
          </div>
          <div>
            <dt>Page</dt>
            <dd>{lastReceipt.page ?? lastReceipt.blockedCategory ?? 'n/a'}</dd>
          </div>
          <div>
            <dt>Page text chars</dt>
            <dd>{lastReceipt.pageTextChars}</dd>
          </div>
          <div>
            <dt>Redactions</dt>
            <dd>{lastReceipt.redactions}</dd>
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
            <dd>{scopeLabels[contextScope]}</dd>
          </div>
          <div>
            <dt>Sensitive fields</dt>
            <dd>Excluded</dd>
          </div>
        </dl>
      </section>

      <form
        className="composer"
        onSubmit={(event) => {
          event.preventDefault();
          void handleSendTurn();
        }}
      >
        <label htmlFor="message">Message</label>
        <textarea
          id="message"
          rows={3}
          placeholder="Ask Hermes..."
          value={messageText}
          onChange={(event) => setMessageText(event.target.value)}
        />
        <button type="submit" disabled={!canSend || !messageText.trim() || isStreaming}>
          {isStreaming ? 'Streaming...' : 'Send'}
        </button>
      </form>
    </main>
  );
}

async function extractContextFromActiveTab(scope: ContextScope): Promise<
  | {
      context: BrowserContextV1;
      receipt: BrowserContextReceipt;
    }
  | undefined
> {
  if (typeof chrome === 'undefined' || !chrome.tabs?.query) {
    return undefined;
  }

  const [tab] = await chrome.tabs.query({ active: true, currentWindow: true });
  if (tab.id === undefined) {
    return undefined;
  }

  return chrome.tabs.sendMessage(tab.id, {
    type: 'HERMES_EXTRACT_CONTEXT',
    scope
  });
}


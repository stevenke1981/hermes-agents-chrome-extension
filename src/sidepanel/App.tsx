import { useEffect, useMemo, useRef, useState } from 'react';

import { redactText } from '../content/redaction';
import { isRestrictedPage } from '../content/restricted-pages';
import { createHermesRestClient, probeGateway, redactSensitiveText } from '../gateway/rest-adapter';
import { createContextReceipt, wrapUntrustedBrowserContext } from '../shared/browser-context-protocol';
import { AGENT_MODES, CONTEXT_SCOPES, EXTENSION_NAME, EXTENSION_VERSION } from '../shared/constants';
import { createDiagnosticsPayload, detectBrowserFamily } from '../shared/diagnostics';
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
import {
  appendPendingTurn,
  applyDeltaToTranscript,
  buildAgentModeSystemPrompt,
  clearConversationTranscript,
  findLastUserMessage,
  resolveSelectedRuntime
} from './conversation';
import type { TranscriptMessage } from './conversation';

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

type ToolActivity = Extract<HermesStreamEvent, { type: 'tool' }> | { type: 'status'; name: string; status: string };

export const ACTIVE_TAB_CONTEXT_TIMEOUT_MS = 1_500;
export const DIAGNOSTICS_COPIED_RESET_MS = 2_500;

export function App() {
  const activeStreamController = useRef<AbortController | undefined>(undefined);
  const [settings, setSettings] = useState<GatewaySettings>(DEFAULT_GATEWAY_SETTINGS);
  const [settingsOpen, setSettingsOpen] = useState(true);
  const [diagnosticsOpen, setDiagnosticsOpen] = useState(false);
  const [tokenInput, setTokenInput] = useState('');
  const [connectionState, setConnectionState] = useState<ConnectionState>('disconnected');
  const [probeResult, setProbeResult] = useState<GatewayProbeResult>(emptyProbe);
  const [activeError, setActiveError] = useState<string | undefined>();
  const [diagnosticsCopied, setDiagnosticsCopied] = useState(false);
  const [contextScope, setContextScope] = useState<ContextScope>('chat_only');
  const [includeOpenTabs, setIncludeOpenTabs] = useState(false);
  const [agentMode, setAgentMode] = useState<AgentMode>('general_chat');
  const [selectedModelId, setSelectedModelId] = useState('');
  const [selectedProfileId, setSelectedProfileId] = useState('');
  const [selectedSessionId, setSelectedSessionId] = useState('');
  const [messageText, setMessageText] = useState('');
  const [isStreaming, setIsStreaming] = useState(false);
  const [transcript, setTranscript] = useState<TranscriptMessage[]>(() => clearConversationTranscript());
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
    await sendMessageToHermes(message);
  }

  async function handleRetryLastMessage() {
    const message = findLastUserMessage(transcript);
    if (!message || !canSend || isStreaming) {
      return;
    }

    await sendMessageToHermes(message);
  }

  function handleCancelStreaming() {
    activeStreamController.current?.abort();
  }

  function handleClearConversation() {
    activeStreamController.current?.abort();
    setTranscript(clearConversationTranscript());
    setToolActivity([
      { type: 'status', name: 'browser context', status: 'waiting' },
      { type: 'status', name: 'Hermes tools', status: 'available after gateway connection' },
      { type: 'status', name: 'redaction', status: 'enforced before sending context' }
    ]);
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
  }

  async function sendMessageToHermes(message: string) {
    const controller = new AbortController();
    activeStreamController.current = controller;
    setActiveError(undefined);
    setIsStreaming(true);
    setTranscript((current) => appendPendingTurn(current, message));

    try {
      const context = contextScope === 'chat_only'
        ? undefined
        : await extractContextFromActiveTab(contextScope, { includeOpenTabs });
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
      const runtime = resolveSelectedRuntime({
        selectedModelId,
        selectedProfileId,
        selectedSessionId
      });
      const browserContext = context ? wrapUntrustedBrowserContext(context.context) : undefined;
      for await (const event of client.sendTurn({
        message,
        ...runtime,
        context: buildAgentModeSystemPrompt(agentMode, browserContext),
        signal: controller.signal
      })) {
        applyStreamEvent(event);
      }
    } catch (error) {
      if (controller.signal.aborted) {
        setToolActivity((current) => [
          ...current,
          { type: 'status', name: 'stream', status: 'canceled by user' }
        ]);
        return;
      }

      const message = error instanceof Error ? redactSensitiveText(error.message) : 'Streaming failed.';
      setActiveError(message);
      setConnectionState('connected_with_warning');
    } finally {
      if (activeStreamController.current === controller) {
        activeStreamController.current = undefined;
      }
      setIsStreaming(false);
    }
  }

  function applyStreamEvent(event: HermesStreamEvent) {
    if (event.type === 'delta') {
      setTranscript((current) => applyDeltaToTranscript(current, event.text));
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

  async function handleCopyDiagnostics() {
    const payload = createDiagnosticsPayload({
      extensionVersion: EXTENSION_VERSION,
      browser: detectBrowserFamily(navigator.userAgent, getNavigatorBrands()),
      gatewayUrl: settings.gatewayUrl,
      mode: settings.mode,
      connectionState,
      capabilities: probeResult.capabilities,
      contextScope,
      lastVisibleErrorCategory: activeError ? 'visible_error' : undefined,
      redactionCounts: lastReceipt.redactions ? { total: lastReceipt.redactions } : {}
    });

    const text = JSON.stringify(payload, null, 2);
    if (navigator.clipboard?.writeText) {
      await navigator.clipboard.writeText(text);
      setDiagnosticsCopied(true);
      scheduleDiagnosticsCopiedReset(setDiagnosticsCopied);
    }
  }

  return (
    <main className="shell" aria-label="Hermes Agents side panel">
      <header className="topbar">
        <div>
          <span className="product-mark" aria-hidden="true" />
          <h1>{EXTENSION_NAME}</h1>
        </div>
        <button
          className={`status-chip ${connectionState}`}
          type="button"
          aria-label="Connection settings"
          onClick={() => setSettingsOpen((open) => !open)}
        >
          {connectionState === 'connecting' ? <span className="spinner" aria-hidden="true" /> : null}
          {connectionLabels[connectionState]}
        </button>
        <div className="topbar-actions" aria-label="Panel drawers">
          <button
            type="button"
            aria-expanded={settingsOpen}
            aria-controls="settings-drawer"
            onClick={() => setSettingsOpen((open) => !open)}
          >
            Settings
          </button>
          <button
            type="button"
            aria-expanded={diagnosticsOpen}
            aria-controls="diagnostics-drawer"
            onClick={() => setDiagnosticsOpen((open) => !open)}
          >
            Diagnostics
          </button>
        </div>
      </header>

      <section
        id="settings-drawer"
        className={`connection drawer ${settingsOpen ? 'open' : ''}`}
        aria-labelledby="connection-title"
      >
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
            <span className="field-help">
              Paste the Hermes API_SERVER_KEY for port 8642. It is sent as Authorization: Bearer and stored only in extension settings.
            </span>
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
          <select value={selectedModelId} onChange={(event) => setSelectedModelId(event.target.value)}>
            <option value="">Hermes / auto</option>
            {probeResult.models.map((model) => (
              <option key={model.id} value={model.id}>
                {model.name ?? model.id}
              </option>
            ))}
          </select>
        </label>
        <label>
          Profile
          <select value={selectedProfileId} onChange={(event) => setSelectedProfileId(event.target.value)}>
            <option value="">Default profile</option>
            {probeResult.profiles.map((profile) => (
              <option key={profile.id} value={profile.id}>
                {profile.name ?? profile.id}
              </option>
            ))}
          </select>
        </label>
        <label>
          Session
          <select value={selectedSessionId} onChange={(event) => setSelectedSessionId(event.target.value)}>
            <option value="">New session</option>
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
        <label className="toggle-row">
          <input
            type="checkbox"
            checked={includeOpenTabs}
            onChange={(event) => setIncludeOpenTabs(event.target.checked)}
          />
          Include open tabs summary
        </label>
        <div className="context-receipt">
          {lastReceipt.blockedCategory
            ? `Blocked sensitive page · ${lastReceipt.blockedCategory}`
            : `${scopeLabels[contextScope]} · ${lastReceipt.browserContentSent ? `${lastReceipt.pageTextChars} chars` : 'no browser content sent'}`}
        </div>
      </section>

      <section className="agent-modes" aria-label="Agent mode">
        {AGENT_MODES.map((mode) => (
          <button
            key={mode}
            type="button"
            className={mode === agentMode ? 'selected' : ''}
            aria-pressed={mode === agentMode}
            onClick={() => setAgentMode(mode)}
          >
            {agentLabels[mode]}
          </button>
        ))}
      </section>

      <section className="transcript" aria-label="Conversation">
        <div className="transcript-actions" aria-label="Conversation actions">
          <button type="button" onClick={() => void handleRetryLastMessage()} disabled={!canSend || isStreaming || !findLastUserMessage(transcript)}>
            Retry
          </button>
          <button type="button" onClick={handleCancelStreaming} disabled={!isStreaming}>
            Cancel
          </button>
          <button type="button" onClick={handleClearConversation}>
            Clear
          </button>
        </div>
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

      <section
        id="diagnostics-drawer"
        className={`diagnostics drawer ${diagnosticsOpen ? 'open' : ''}`}
        aria-label="Diagnostics"
      >
        <div className="section-heading">
          <h2>Diagnostics</h2>
          <button type="button" onClick={() => void handleCopyDiagnostics()}>
            {diagnosticsCopied ? 'Diagnostics copied' : 'Copy diagnostics'}
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
          onKeyDown={(event) => {
            if ((event.ctrlKey || event.metaKey) && event.key === 'Enter') {
              event.preventDefault();
              void handleSendTurn();
            }
            if (event.key === 'Escape') {
              setSettingsOpen(false);
              setDiagnosticsOpen(false);
            }
          }}
        />
        <button type="submit" disabled={!canSend || !messageText.trim() || isStreaming}>
          <SendButtonContent isStreaming={isStreaming} />
        </button>
      </form>
    </main>
  );
}

export function SendButtonContent({ isStreaming }: { isStreaming: boolean }) {
  if (!isStreaming) {
    return <>Send</>;
  }

  return (
    <>
      <span className="spinner send-spinner" aria-hidden="true" />
      Streaming...
    </>
  );
}

export function scheduleDiagnosticsCopiedReset(
  setCopied: (value: boolean) => void,
  delayMs = DIAGNOSTICS_COPIED_RESET_MS
): ReturnType<typeof setTimeout> {
  return globalThis.setTimeout(() => setCopied(false), delayMs);
}

function getNavigatorBrands(): Array<{ brand: string; version?: string }> {
  const navigatorWithHints = navigator as Navigator & {
    userAgentData?: { brands?: Array<{ brand: string; version?: string }> };
  };
  return navigatorWithHints.userAgentData?.brands ?? [];
}

interface ActiveTabMessageApi {
  query: (queryInfo: chrome.tabs.QueryInfo) => Promise<
    Array<{
      id?: number;
      url?: string;
      title?: string;
      windowId?: number;
    }>
  >;
  sendMessage: (tabId: number, message: unknown) => Promise<ActiveTabContextResponse>;
}

type ActiveTabContextResponse = {
  context: BrowserContextV1;
  receipt: BrowserContextReceipt;
};

interface ActiveTabExtractionOptions {
  tabs?: ActiveTabMessageApi;
  timeoutMs?: number;
  includeOpenTabs?: boolean;
}

export async function extractContextFromActiveTab(
  scope: ContextScope,
  options: ActiveTabExtractionOptions = {}
): Promise<ActiveTabContextResponse | undefined> {
  const tabs = options.tabs ?? (typeof chrome === 'undefined' ? undefined : chrome.tabs);
  if (!tabs?.query) {
    return undefined;
  }

  const [tab] = await tabs.query({ active: true, currentWindow: true });
  if (tab.id === undefined) {
    return undefined;
  }

  const response = await withTimeout(
    tabs.sendMessage(tab.id, {
      type: 'HERMES_EXTRACT_CONTEXT',
      scope
    }),
    options.timeoutMs ?? ACTIVE_TAB_CONTEXT_TIMEOUT_MS
  ).catch(() => undefined);

  if (!response || !options.includeOpenTabs || response.context.restricted?.blocked) {
    return response;
  }

  const openTabs = await collectOpenTabsSummary(tabs);
  const context = {
    ...response.context,
    openTabs
  };

  return {
    context,
    receipt: createContextReceipt(context)
  };
}

async function collectOpenTabsSummary(tabs: ActiveTabMessageApi): Promise<BrowserContextV1['openTabs']> {
  const openTabs = await tabs.query({ currentWindow: true });
  return openTabs.flatMap((tab) => {
    if (!tab.url) {
      return [];
    }

    try {
      const url = new URL(tab.url);
      if (url.protocol !== 'http:' && url.protocol !== 'https:') {
        return [];
      }
      if (isRestrictedPage(tab.url).blocked) {
        return [];
      }

      const title = tab.title ? redactText(tab.title, 'tab_title').text : undefined;

      return [
        {
          origin: url.origin,
          ...(title ? { title } : {}),
          ...(tab.id !== undefined ? { tabId: tab.id } : {}),
          ...(tab.windowId !== undefined ? { windowId: tab.windowId } : {})
        }
      ];
    } catch {
      return [];
    }
  });
}

async function withTimeout<T>(
  promise: Promise<T>,
  timeoutMs: number
): Promise<T | undefined> {
  let timeoutId: ReturnType<typeof setTimeout> | undefined;
  try {
    return await Promise.race([
      promise,
      new Promise<undefined>((resolve) => {
        timeoutId = globalThis.setTimeout(() => resolve(undefined), timeoutMs);
      })
    ]);
  } finally {
    if (timeoutId) {
      globalThis.clearTimeout(timeoutId);
    }
  }
}

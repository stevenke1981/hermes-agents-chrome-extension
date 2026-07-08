import type { AGENT_MODES, CONTEXT_SCOPES } from './constants';

export type ContextScope = (typeof CONTEXT_SCOPES)[number];
export type AgentMode = (typeof AGENT_MODES)[number];

export type ConnectionState =
  | 'disconnected'
  | 'connecting'
  | 'connected'
  | 'connected_with_warning'
  | 'fallback'
  | 'error';

export type GatewayMode = 'local_api' | 'remote_api' | 'remote_dashboard_ws';

export interface GatewaySettings {
  mode: GatewayMode;
  gatewayUrl: string;
  token?: string;
  tokenSavedAt?: string;
  allowInsecureRemoteHttp: boolean;
  corsExtensionId?: string;
}

export interface HealthStatus {
  ok: boolean;
  status?: string;
  version?: string;
  raw?: unknown;
}

export interface ModelInfo {
  id: string;
  name?: string;
  provider?: string;
}

export interface SessionInfo {
  id: string;
  title?: string;
  updatedAt?: string;
}

export interface SkillInfo {
  id: string;
  name?: string;
  description?: string;
}

export interface ProfileInfo {
  id: string;
  name?: string;
}

export interface CapabilityInfo {
  flags: Record<string, boolean>;
  raw?: unknown;
}

export type BrowserFamily = 'chrome' | 'edge' | 'brave' | 'chromium' | 'unknown';

export interface SafeTabInfo {
  origin: string;
  title?: string;
  tabId?: number;
  windowId?: number;
}

export interface RedactedTextBlock {
  text: string;
  originalChars: number;
}

export interface PageLinkContext {
  text: string;
  href: string;
}

export interface PageContext {
  title?: string;
  metaDescription?: string;
  headings?: string[];
  text: string;
  links?: PageLinkContext[];
  buttons?: string[];
  formLabels?: string[];
}

export interface AttachmentContext {
  name: string;
  mimeType?: string;
  size?: number;
}

export interface RedactionEvent {
  type:
    | 'bearer'
    | 'api_key'
    | 'jwt'
    | 'private_key'
    | 'secret_assignment'
    | 'url_secret'
    | 'cookie_like';
  count: number;
  location: 'page_text' | 'selected_text' | 'url' | 'tab_title' | 'attachment';
}

export type RestrictedPageCategory =
  | 'browser_internal'
  | 'extension_page'
  | 'local_file'
  | 'password_manager'
  | 'banking'
  | 'crypto'
  | 'payment'
  | 'health'
  | 'government_tax'
  | 'admin_credentials';

export interface RestrictedPageResult {
  blocked: boolean;
  category?: RestrictedPageCategory;
  originHash?: string;
}

export interface BrowserContextV1 {
  protocol: 'hermes.browser.context.v1';
  id: string;
  createdAt: string;
  scope: ContextScope;
  source: {
    browser: BrowserFamily;
    extensionVersion: string;
    tabId?: number;
    windowId?: number;
  };
  activeTab?: SafeTabInfo;
  selectedText?: RedactedTextBlock;
  page?: PageContext;
  openTabs?: SafeTabInfo[];
  attachments?: AttachmentContext[];
  redactions: RedactionEvent[];
  limits: {
    maxChars: number;
    truncated: boolean;
    originalChars?: number;
    sentChars: number;
  };
  restricted?: RestrictedPageResult;
}

export interface BrowserContextBuildInput {
  scope: ContextScope;
  source: BrowserContextV1['source'];
  activeTab?: SafeTabInfo;
  selectedText?: string;
  page?: PageContext;
  openTabs?: SafeTabInfo[];
  includeOpenTabs?: boolean;
  attachments?: AttachmentContext[];
  redactions?: RedactionEvent[];
  restricted?: RestrictedPageResult;
  maxChars?: number;
}

export interface BrowserContextReceipt {
  scope: ContextScope;
  page?: string;
  blockedCategory?: string;
  browserContentSent: boolean;
  selectedTextIncluded: boolean;
  pageTextChars: number;
  openTabsSent: number;
  attachmentsSent: number;
  redactions: number;
  truncated: boolean;
}

export interface HermesTurnInput {
  message: string;
  model?: string;
  profile?: string;
  sessionId?: string;
  context?: string;
  signal?: AbortSignal;
}

export type HermesStreamEvent =
  | { type: 'delta'; text: string }
  | { type: 'tool'; name: string; status?: string }
  | { type: 'warning'; message: string }
  | { type: 'error'; message: string }
  | { type: 'done' };

export interface GatewayCatalog {
  health?: HealthStatus;
  models: ModelInfo[];
  sessions: SessionInfo[];
  skills: SkillInfo[];
  profiles: ProfileInfo[];
  capabilities?: CapabilityInfo;
}

export interface GatewayProbeResult extends GatewayCatalog {
  state: Extract<ConnectionState, 'connected' | 'connected_with_warning' | 'error'>;
  gatewayOrigin?: string;
  warnings: string[];
  error?: string;
}

export interface SidePanelState {
  connectionState: ConnectionState;
  contextScope: ContextScope;
  agentMode: AgentMode;
  gatewaySettings: GatewaySettings;
}


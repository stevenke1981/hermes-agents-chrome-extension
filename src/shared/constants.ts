export const EXTENSION_NAME = 'Hermes Agents';
export const DEFAULT_GATEWAY_URL = 'http://127.0.0.1:8642';
export const EXTENSION_VERSION = '0.1.0';

export const CONTEXT_SCOPES = [
  'chat_only',
  'follow_active_tab',
  'pinned_tab',
  'page_only',
  'selected_text_only'
] as const;

export const AGENT_MODES = [
  'general_chat',
  'summarize_page',
  'explain_page',
  'rewrite_selection',
  'action_items',
  'dev_handoff',
  'qa_check',
  'security_review'
] as const;

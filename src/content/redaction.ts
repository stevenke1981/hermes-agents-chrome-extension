import type { PageContext, RedactionEvent, SafeTabInfo } from '../shared/types';

type RedactionLocation = RedactionEvent['location'];

type RedactionRule = {
  type: RedactionEvent['type'];
  replacement: string | ((match: string) => string);
  pattern: RegExp;
};

const rules: RedactionRule[] = [
  {
    type: 'private_key',
    replacement: '[REDACTED_PRIVATE_KEY]',
    pattern: /-----BEGIN [A-Z ]*PRIVATE KEY-----[\s\S]*?-----END [A-Z ]*PRIVATE KEY-----/g
  },
  {
    type: 'bearer',
    replacement: 'Authorization: Bearer [REDACTED_BEARER]',
    pattern: /Authorization:\s*Bearer\s+"[^"]+"/gi
  },
  {
    type: 'bearer',
    replacement: 'Bearer [REDACTED_BEARER]',
    pattern: /\bBearer\s+"[^"]+"/gi
  },
  {
    type: 'bearer',
    replacement: 'Authorization: Bearer [REDACTED_BEARER]',
    pattern: /Authorization:\s*Bearer\s+[A-Za-z0-9._~+/=-]+/gi
  },
  {
    type: 'bearer',
    replacement: 'Bearer [REDACTED_BEARER]',
    pattern: /\bBearer\s+[A-Za-z0-9._~+/=-]+/gi
  },
  {
    type: 'url_secret',
    replacement: (match) => match.replace(/=([^&\s]+)/, '=[REDACTED]'),
    pattern: /([?&](?:token|key|auth|api_key|apikey|access_token|refresh_token)=)([^&\s]+)/gi
  },
  {
    type: 'secret_assignment',
    replacement: (match) => {
      const [name, value] = match.split('=');
      if (name === 'GOOGLE_API_KEY' && value?.startsWith('AIza')) {
        return `${name}=[REDACTED_API_KEY]`;
      }
      return `${name}=[REDACTED_SECRET_ASSIGNMENT]`;
    },
    pattern: /\b(?:[A-Z0-9_]*(?:API_KEY|TOKEN|SECRET|PASSWORD|PRIVATE_KEY|SLACK_TOKEN|GITHUB_TOKEN|ANTHROPIC_API_KEY|OPENAI_API_KEY|GOOGLE_API_KEY))=([^\s&]+)/g
  },
  {
    type: 'api_key',
    replacement: '[REDACTED_API_KEY]',
    pattern: /\b(?:sk-[A-Za-z0-9_-]{8,}|AIza[0-9A-Za-z_-]{20,}|ghp_[A-Za-z0-9_]{20,}|github_pat_[A-Za-z0-9_]{10,}_[A-Za-z0-9_]+|xox[abp]-[A-Za-z0-9-]{12,})\b/g
  },
  {
    type: 'jwt',
    replacement: '[REDACTED_JWT]',
    pattern: /\b[A-Za-z0-9_-]{3,}\.[A-Za-z0-9_-]{3,}\.[A-Za-z0-9_-]{3,}\b/g
  },
  {
    type: 'cookie_like',
    replacement: '[REDACTED_COOKIE]',
    pattern: /\b(?:session|sid)=([A-Za-z0-9._~-]{4,})\b/gi
  }
];

export interface RedactionResult {
  text: string;
  events: RedactionEvent[];
}

export interface RedactedBrowserContextInput {
  activeTab?: SafeTabInfo;
  selectedText?: string;
  page?: PageContext;
  redactions: RedactionEvent[];
}

export function redactText(text: string, location: RedactionLocation): RedactionResult {
  const events = new Map<string, RedactionEvent>();
  let redacted = text;

  for (const rule of rules) {
    redacted = redacted.replace(rule.pattern, (match) => {
      const key = `${rule.type}:${location}`;
      const current = events.get(key) ?? { type: rule.type, location, count: 0 };
      events.set(key, { ...current, count: current.count + 1 });
      return typeof rule.replacement === 'function' ? rule.replacement(match) : rule.replacement;
    });
  }

  return {
    text: redacted,
    events: Array.from(events.values())
  };
}

export function redactBrowserContextInput(input: {
  activeTab?: SafeTabInfo;
  selectedText?: string;
  page?: PageContext;
}): RedactedBrowserContextInput {
  const redactions: RedactionEvent[] = [];
  const activeTab = input.activeTab ? redactSafeTab(input.activeTab, redactions) : undefined;
  const selectedTextResult = input.selectedText ? redactText(input.selectedText, 'selected_text') : undefined;
  const page = input.page ? redactPage(input.page, redactions) : undefined;

  if (selectedTextResult) {
    redactions.push(...selectedTextResult.events);
  }

  return {
    activeTab,
    selectedText: selectedTextResult?.text,
    page,
    redactions: mergeRedactions(redactions)
  };
}

function redactSafeTab(tab: SafeTabInfo, redactions: RedactionEvent[]): SafeTabInfo {
  const origin = redactText(tab.origin, 'url');
  const title = tab.title ? redactText(tab.title, 'tab_title') : undefined;
  redactions.push(...origin.events, ...(title?.events ?? []));
  return {
    ...tab,
    origin: origin.text,
    title: title?.text
  };
}

function redactPage(page: PageContext, redactions: RedactionEvent[]): PageContext {
  const text = redactText(page.text, 'page_text');
  const title = page.title ? redactText(page.title, 'tab_title') : undefined;
  redactions.push(...text.events, ...(title?.events ?? []));
  return {
    ...page,
    title: title?.text ?? page.title,
    text: text.text
  };
}

function mergeRedactions(events: RedactionEvent[]): RedactionEvent[] {
  const merged = new Map<string, RedactionEvent>();
  for (const event of events) {
    const key = `${event.type}:${event.location}`;
    const current = merged.get(key) ?? { ...event, count: 0 };
    merged.set(key, { ...current, count: current.count + event.count });
  }
  return Array.from(merged.values());
}

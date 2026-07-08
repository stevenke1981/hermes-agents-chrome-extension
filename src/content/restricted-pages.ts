import { buildBrowserContext } from '../shared/browser-context-protocol';
import type {
  BrowserContextV1,
  ContextScope,
  RestrictedPageCategory,
  RestrictedPageResult
} from '../shared/types';

type RestrictedPattern = {
  category: RestrictedPageCategory;
  test: (url: URL, rawUrl: string) => boolean;
};

const browserInternalProtocols = new Set(['chrome:', 'edge:', 'about:', 'devtools:']);

const restrictedPatterns: RestrictedPattern[] = [
  { category: 'government_tax', test: (url) => matchesAny(url, ['tax', 'irs', 'identity', 'idme']) || url.hostname.endsWith('.gov') && matchesAny(url, ['account']) },
  { category: 'password_manager', test: (url) => matchesAny(url, ['password', 'passwd', 'vault', '1password', 'bitwarden', 'lastpass', 'dashlane', 'secrets']) },
  { category: 'banking', test: (url) => matchesAny(url, ['bank', 'banking', 'account', 'accounts', 'credit-card', 'creditcard']) },
  { category: 'crypto', test: (url) => matchesAny(url, ['wallet', 'crypto', 'seed', 'exchange', 'metamask', 'coinbase', 'binance']) },
  { category: 'payment', test: (url) => matchesAny(url, ['checkout', 'payment', 'billing', 'invoice', 'card']) },
  { category: 'health', test: (url) => matchesAny(url, ['health', 'medical', 'patient', 'records', 'portal']) },
  { category: 'admin_credentials', test: (url) => matchesAny(url, ['iam', 'security_credentials', 'credentials', 'admin/secrets', 'settings/secrets']) }
];

export function isRestrictedPage(rawUrl: string): RestrictedPageResult {
  let url: URL;
  try {
    url = new URL(rawUrl);
  } catch {
    return { blocked: true, category: 'browser_internal' };
  }

  if (browserInternalProtocols.has(url.protocol)) {
    return { blocked: true, category: 'browser_internal' };
  }

  if (url.protocol === 'chrome-extension:' || url.protocol === 'moz-extension:') {
    return { blocked: true, category: 'extension_page' };
  }

  if (url.protocol === 'file:') {
    return { blocked: true, category: 'local_file' };
  }

  for (const pattern of restrictedPatterns) {
    if (pattern.test(url, rawUrl)) {
      return { blocked: true, category: pattern.category, originHash: hashOrigin(url.origin) };
    }
  }

  return { blocked: false };
}

export function createBlockedBrowserContext(input: {
  url: string;
  scope: ContextScope;
  source: BrowserContextV1['source'];
}): BrowserContextV1 {
  const restricted = isRestrictedPage(input.url);
  return buildBrowserContext({
    scope: input.scope,
    source: input.source,
    restricted: {
      blocked: true,
      category: restricted.category ?? 'browser_internal',
      originHash: restricted.originHash
    }
  });
}

function matchesAny(url: URL, terms: string[]): boolean {
  const haystack = `${url.hostname} ${url.pathname}`.toLowerCase();
  return terms.some((term) => haystack.includes(term));
}

function hashOrigin(origin: string): string {
  let hash = 0;
  for (const char of origin) {
    hash = (hash * 31 + char.charCodeAt(0)) >>> 0;
  }
  return hash.toString(16).padStart(8, '0');
}

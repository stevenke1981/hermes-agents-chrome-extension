import type { PageContext } from '../shared/types';

const MAX_ITEMS = 20;
const MAX_PARAGRAPHS = 40;

type ElementLike = {
  textContent?: string | null;
  href?: string;
  getAttribute?: (name: string) => string | null;
};

type ExtractableRoot = {
  title?: string;
  querySelector: (selector: string) => ElementLike | null;
  querySelectorAll: (selector: string) => Iterable<ElementLike> | ArrayLike<ElementLike>;
};

export function extractPageContext(root: ExtractableRoot = document): PageContext {
  const title = cleanText(root.title ?? '');
  const metaDescription = cleanText(
    root.querySelector('meta[name="description"]')?.getAttribute?.('content') ??
      root.querySelector('meta[name="description"]')?.textContent ??
      ''
  );
  const headings = collectText(root, 'h1, h2, h3', MAX_ITEMS);
  const paragraphs = collectText(root, 'p, article, main li', MAX_PARAGRAPHS);
  const links = collectLinks(root);
  const buttons = collectText(root, 'button, [role="button"]', MAX_ITEMS);
  const formLabels = collectText(
    root,
    'label, input[aria-label], textarea[aria-label], select[aria-label]',
    MAX_ITEMS
  );

  return {
    title,
    metaDescription: metaDescription || undefined,
    headings,
    text: paragraphs.join('\n'),
    links,
    buttons,
    formLabels
  };
}

function collectText(root: ExtractableRoot, selector: string, limit: number): string[] {
  return Array.from(root.querySelectorAll(selector))
    .map((element) => cleanText(element.textContent ?? element.getAttribute?.('aria-label') ?? ''))
    .filter(Boolean)
    .slice(0, limit);
}

function collectLinks(root: ExtractableRoot) {
  return Array.from(root.querySelectorAll('a[href]'))
    .map((element) => ({
      text: cleanText(element.textContent ?? ''),
      href: element.href ?? element.getAttribute?.('href') ?? ''
    }))
    .filter((link) => link.text && link.href)
    .slice(0, MAX_ITEMS);
}

function cleanText(value: string): string {
  return value.replace(/\s+/g, ' ').trim();
}

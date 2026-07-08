import { describe, expect, it } from 'vitest';

import { extractPageContext } from '../src/content/extractors';

describe('content extractors', () => {
  it('extracts readable page structure from a document-like root', () => {
    const root = createFakeRoot({
      title: 'Fixture title',
      metaDescription: 'Fixture description',
      headings: ['Main', 'Details'],
      paragraphs: ['First paragraph', 'Second paragraph'],
      links: [
        { text: 'Docs', href: 'https://example.com/docs' },
        { text: 'Empty', href: '' }
      ],
      buttons: ['Save', 'Cancel'],
      formLabels: ['Email', 'API token']
    });

    const page = extractPageContext(root);

    expect(page).toMatchObject({
      title: 'Fixture title',
      metaDescription: 'Fixture description',
      headings: ['Main', 'Details'],
      links: [{ text: 'Docs', href: 'https://example.com/docs' }],
      buttons: ['Save', 'Cancel'],
      formLabels: ['Email', 'API token']
    });
    expect(page.text).toContain('First paragraph');
    expect(page.text).toContain('Second paragraph');
  });

  it('limits noisy repeated extraction output', () => {
    const root = createFakeRoot({
      title: 'Fixture title',
      metaDescription: '',
      headings: Array.from({ length: 30 }, (_, index) => `Heading ${index}`),
      paragraphs: Array.from({ length: 80 }, (_, index) => `Paragraph ${index}`),
      links: Array.from({ length: 40 }, (_, index) => ({
        text: `Link ${index}`,
        href: `https://example.com/${index}`
      })),
      buttons: Array.from({ length: 40 }, (_, index) => `Button ${index}`),
      formLabels: Array.from({ length: 40 }, (_, index) => `Label ${index}`)
    });

    const page = extractPageContext(root);

    expect(page.headings).toHaveLength(20);
    expect(page.links).toHaveLength(20);
    expect(page.buttons).toHaveLength(20);
    expect(page.formLabels).toHaveLength(20);
    expect(page.text.split('\n')).toHaveLength(40);
  });
});

type FakeRootInput = {
  title: string;
  metaDescription: string;
  headings: string[];
  paragraphs: string[];
  links: Array<{ text: string; href: string }>;
  buttons: string[];
  formLabels: string[];
};

function createFakeRoot(input: FakeRootInput) {
  return {
    title: input.title,
    querySelector(selector: string) {
      if (selector === 'meta[name="description"]') {
        return fakeElement(input.metaDescription);
      }
      return null;
    },
    querySelectorAll(selector: string) {
      if (selector === 'h1, h2, h3') {
        return input.headings.map((heading) => fakeElement(heading));
      }
      if (selector === 'p, article, main li') {
        return input.paragraphs.map((paragraph) => fakeElement(paragraph));
      }
      if (selector === 'a[href]') {
        return input.links.map((link) => fakeElement(link.text, { href: link.href }));
      }
      if (selector === 'button, [role="button"]') {
        return input.buttons.map((button) => fakeElement(button));
      }
      if (selector === 'label, input[aria-label], textarea[aria-label], select[aria-label]') {
        return input.formLabels.map((label) => fakeElement(label));
      }
      return [];
    }
  };
}

function fakeElement(textContent: string, extra: Record<string, string> = {}) {
  return {
    textContent,
    getAttribute(name: string) {
      return extra[name] ?? null;
    },
    ...extra
  };
}

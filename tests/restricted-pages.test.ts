import { describe, expect, it } from 'vitest';

import { createBlockedBrowserContext, hashOriginWithWebCrypto, isRestrictedPage } from '../src/content/restricted-pages';

describe('restricted page classifier', () => {
  it.each([
    ['chrome://extensions', 'browser_internal'],
    ['edge://settings', 'browser_internal'],
    ['about:blank', 'browser_internal'],
    ['devtools://devtools/bundled/inspector.html', 'browser_internal'],
    ['chrome-extension://abc/index.html', 'extension_page'],
    ['file:///C:/Users/test/secret.txt', 'local_file'],
    ['https://bank.example.com/accounts', 'banking'],
    ['https://wallet.example.com/seed', 'crypto'],
    ['https://checkout.example.com/payment', 'payment'],
    ['https://health.example.com/records', 'health'],
    ['https://tax.example.gov/account', 'government_tax'],
    ['https://vault.example.com/passwords', 'password_manager'],
    ['https://console.aws.amazon.com/iam/home#/security_credentials', 'admin_credentials']
  ])('blocks %s as %s', (url, category) => {
    expect(isRestrictedPage(url)).toMatchObject({
      blocked: true,
      category
    });
  });

  it('allows normal https pages', () => {
    expect(isRestrictedPage('https://example.com/docs')).toEqual({
      blocked: false
    });
  });

  it('creates blocked payload without title, URL, selected text, or page content', () => {
    const context = createBlockedBrowserContext({
      url: 'https://checkout.example.com/payment?token=secret',
      scope: 'follow_active_tab',
      source: { browser: 'chrome', extensionVersion: '0.1.0' }
    });

    expect(context.restricted).toMatchObject({ blocked: true, category: 'payment' });
    expect(context.activeTab).toBeUndefined();
    expect(context.selectedText).toBeUndefined();
    expect(context.page).toBeUndefined();
    expect(context.limits.sentChars).toBe(0);
    expect(JSON.stringify(context)).not.toContain('checkout.example.com/payment');
    expect(JSON.stringify(context)).not.toContain('token=secret');
  });

  it('can hash origins with Web Crypto for async sensitive-page receipts', async () => {
    const hash = await hashOriginWithWebCrypto('https://checkout.example.com');

    expect(hash).toHaveLength(64);
    expect(hash).toMatch(/^[a-f0-9]+$/);
  });
});

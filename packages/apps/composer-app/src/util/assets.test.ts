//
// Copyright 2026 DXOS.org
//

import { describe, expect, test } from 'vitest';

import { isHashedAssetPath, isMissingAsset } from './assets.ts';

const missing = (overrides: Partial<Parameters<typeof isMissingAsset>[0]> = {}) =>
  isMissingAsset({
    status: 200,
    pathname: '/assets/async-D15Zo-_P.js',
    secFetchMode: 'cors',
    contentType: 'text/html',
    ...overrides,
  });

describe('isHashedAssetPath', () => {
  test('flat build output is content-hashed', () => {
    expect(isHashedAssetPath('/assets/async-D15Zo-_P.js')).toBe(true);
    expect(isHashedAssetPath('/assets/index-BcD1234x.css')).toBe(true);
    expect(isHashedAssetPath('/assets/automerge-ChDF8FTU.wasm')).toBe(true);
  });

  test('copied static trees under assets are NOT', () => {
    // `/assets/plugin-tldraw/**` keeps stable filenames across builds. Marking these immutable for a
    // year would strand every existing client on the icons and fonts it already has.
    expect(isHashedAssetPath('/assets/plugin-tldraw/embed-icons/codepen.png')).toBe(false);
    expect(isHashedAssetPath('/assets/plugin-tldraw/fonts/Shantell_Sans.woff2')).toBe(false);
  });

  test('nothing outside /assets/ is', () => {
    for (const pathname of ['/index.html', '/sw.js', '/icons.svg', '/favicon.ico', '/phosphor/house.svg']) {
      expect(isHashedAssetPath(pathname)).toBe(false);
    }
  });
});

describe('isMissingAsset', () => {
  test('an asset request answered with the SPA fallback is a miss', () => {
    expect(missing()).toBe(true);
  });

  test('a navigation keeps the fallback, whatever the URL looks like', () => {
    // The client-side router owns these, and a route is allowed to contain a dot.
    expect(missing({ secFetchMode: 'navigate' })).toBe(false);
    expect(missing({ secFetchMode: 'navigate', pathname: '/space/v1.2/doc' })).toBe(false);
  });

  test('a real asset is not a miss', () => {
    expect(missing({ contentType: 'text/javascript' })).toBe(false);
    expect(missing({ contentType: 'application/wasm' })).toBe(false);
  });

  test('an HTML entry point serving HTML is not a miss', () => {
    for (const pathname of ['/index.html', '/recovery.html', '/reset.html', '/devtools.html']) {
      expect(missing({ pathname })).toBe(false);
    }
  });

  test('an extensionless client-side route is not a miss', () => {
    // These legitimately resolve to index.html; only paths naming a file can be missing.
    expect(missing({ pathname: '/BUZEPQGWWI6IHVKINC4AVBC74SSG7RL5F/types/document' })).toBe(false);
    expect(missing({ pathname: '/' })).toBe(false);
  });

  test('a non-200 is left alone', () => {
    expect(missing({ status: 304 })).toBe(false);
    expect(missing({ status: 404 })).toBe(false);
  });

  test('a client sending no Sec-Fetch-Mode is treated as a subresource', () => {
    // curl and other non-browser clients send none. Treating them as navigations would hide the
    // failure from exactly the probe used to verify this behaviour.
    expect(missing({ secFetchMode: null })).toBe(true);
  });

  test('a charset on the fallback content type still matches', () => {
    expect(missing({ contentType: 'text/html; charset=utf-8' })).toBe(true);
  });
});

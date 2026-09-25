//
// Copyright 2026 DXOS.org
//

import { describe, expect, test } from 'vitest';

import { isFileRequest, isHashedAssetPath } from './assets.ts';

const fileRequest = (overrides: Partial<Parameters<typeof isFileRequest>[0]> = {}) =>
  isFileRequest({ pathname: '/assets/async-D15Zo-_P.js', secFetchMode: 'cors', ...overrides });

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

describe('isFileRequest', () => {
  test('a subresource naming a missing file is a file request', () => {
    expect(fileRequest()).toBe(true);
    expect(fileRequest({ pathname: '/assets/plugin-tldraw/fonts/gone.woff2' })).toBe(true);
  });

  test('a navigation is a route, whatever the URL looks like', () => {
    // The client-side router owns these, and a route is allowed to contain a dot.
    expect(fileRequest({ secFetchMode: 'navigate' })).toBe(false);
    expect(fileRequest({ secFetchMode: 'navigate', pathname: '/space/v1.2/doc' })).toBe(false);
  });

  test('a missing HTML file fetched as a subresource is a file request', () => {
    // Real HTML entry points are served by the asset server and never get here.
    expect(fileRequest({ pathname: '/missing.html' })).toBe(true);
    expect(fileRequest({ pathname: '/missing.html', secFetchMode: 'navigate' })).toBe(false);
  });

  test('an extensionless path is a route', () => {
    expect(fileRequest({ pathname: '/BUZEPQGWWI6IHVKINC4AVBC74SSG7RL5F/types/document' })).toBe(false);
    expect(fileRequest({ pathname: '/' })).toBe(false);
  });

  test('a client sending no Sec-Fetch-Mode is treated as a subresource', () => {
    // curl and other non-browser clients send none. Treating them as navigations would hide the
    // 404 from exactly the probe used to verify this behaviour.
    expect(fileRequest({ secFetchMode: null })).toBe(true);
  });
});

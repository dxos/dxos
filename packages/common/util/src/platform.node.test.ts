//
// Copyright 2020 DXOS.org
//

import { afterEach, expect, test } from 'vitest';

import { isIosApp, isNode } from './platform';

test('knows when running in node', () => {
  expect(isNode()).to.be.true;
});

/**
 * Node's `navigator` has no `maxTouchPoints` and reports the host platform, so both are shadowed with
 * own properties per case and deleted afterwards.
 */
const stubNavigator = (platform: string, maxTouchPoints: number) => {
  Object.defineProperty(navigator, 'maxTouchPoints', { value: maxTouchPoints, configurable: true });
  // `getHostPlatform` prefers the user-agent hints when present.
  Object.defineProperty(navigator, 'userAgentData', { value: { platform }, configurable: true });
};

afterEach(() => {
  for (const key of ['maxTouchPoints', 'userAgentData']) {
    Reflect.deleteProperty(navigator, key);
  }
  Reflect.deleteProperty(globalThis, '__TAURI__');
});

test('iOS app detection requires the native shell', () => {
  stubNavigator('iPhone', 5);
  expect(isIosApp()).to.be.false;
});

test('iOS app detection accepts iPhone and iPad', () => {
  Object.defineProperty(globalThis, '__TAURI__', { value: {}, configurable: true });

  stubNavigator('iPhone', 5);
  expect(isIosApp()).to.be.true;

  // iPadOS reports a desktop platform; the touch points are what set it apart from a Mac.
  stubNavigator('MacIntel', 5);
  expect(isIosApp()).to.be.true;

  stubNavigator('MacIntel', 0);
  expect(isIosApp()).to.be.false;

  stubNavigator('Win32', 0);
  expect(isIosApp()).to.be.false;
});

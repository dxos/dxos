//
// Copyright 2026 DXOS.org
//

import { describe, test } from 'vitest';

import { bootPreload } from './module-preload.ts';

const DEPS = ['assets/boot-0-a.js', 'assets/plugin-x-b.js'];

describe('bootPreload', () => {
  test('keeps the HTML entry preloads', ({ expect }) => {
    const resolve = bootPreload();
    expect(resolve('assets/main-c.js', DEPS, { hostId: 'index.html', hostType: 'html' })).toEqual(DEPS);
  });

  test('drops the preloads of every dynamic import by default', ({ expect }) => {
    const resolve = bootPreload();
    expect(resolve('assets/plugin-x-b.js', DEPS, { hostId: 'assets/boot-0-a.js', hostType: 'js' })).toEqual([]);
    expect(resolve('assets/plugin-y-d.js', DEPS, { hostId: 'assets/plugin-x-b.js', hostType: 'js' })).toEqual([]);
  });

  test('keeps the preloads of dynamic imports made from a boot chunk', ({ expect }) => {
    const resolve = bootPreload({ isBootHost: (hostId) => hostId.startsWith('assets/boot-') });
    expect(resolve('assets/plugin-x-b.js', DEPS, { hostId: 'assets/boot-0-a.js', hostType: 'js' })).toEqual(DEPS);
    expect(resolve('assets/plugin-y-d.js', DEPS, { hostId: 'assets/plugin-x-b.js', hostType: 'js' })).toEqual([]);
  });
});

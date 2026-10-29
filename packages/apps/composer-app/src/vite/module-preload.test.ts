//
// Copyright 2026 DXOS.org
//

import { describe, test } from 'vitest';

import { bootPreload } from './module-preload.ts';

const DEPS = ['assets/boot-0-a.js', 'assets/plugin-x-b.js'];

describe('bootPreload', () => {
  test('keeps the HTML entry preloads', ({ expect }) => {
    expect(bootPreload('assets/main-c.js', DEPS, { hostId: 'index.html', hostType: 'html' })).toEqual(DEPS);
  });

  test('drops the preloads of dynamic imports', ({ expect }) => {
    expect(bootPreload('assets/plugin-x-b.js', DEPS, { hostId: 'assets/boot-0-a.js', hostType: 'js' })).toEqual([]);
  });
});

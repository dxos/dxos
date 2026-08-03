//
// Copyright 2026 DXOS.org
//

import { describe, test } from 'vitest';

import { getDeckPresentation } from './useDeckPresentation';

describe('getDeckPresentation', () => {
  test('a singleton deck renders fullbleed off mobile', ({ expect }) => {
    expect(getDeckPresentation(1, 'desktop')).toEqual('fullbleed');
    expect(getDeckPresentation(1, 'tablet')).toEqual('fullbleed');
  });

  test('two planks slide, each in its own container', ({ expect }) => {
    expect(getDeckPresentation(2, 'desktop')).toEqual('sliding');
    expect(getDeckPresentation(2, 'tablet')).toEqual('sliding');
  });

  test('three or more planks render sliding off mobile', ({ expect }) => {
    expect(getDeckPresentation(3, 'desktop')).toEqual('sliding');
    expect(getDeckPresentation(5, 'desktop')).toEqual('sliding');
  });

  test('mobile always renders sliding, regardless of plank count', ({ expect }) => {
    expect(getDeckPresentation(0, 'mobile')).toEqual('sliding');
    expect(getDeckPresentation(1, 'mobile')).toEqual('sliding');
    expect(getDeckPresentation(2, 'mobile')).toEqual('sliding');
  });

  test('zero planks render sliding (empty stack) off mobile', ({ expect }) => {
    expect(getDeckPresentation(0, 'desktop')).toEqual('sliding');
  });
});

//
// Copyright 2026 DXOS.org
//

import { describe, expect, test } from 'vitest';

import { getDeckPresentation } from './useDeckPresentation';

describe('getDeckPresentation', () => {
  test('a singleton active deck renders fullbleed on desktop', () => {
    expect(getDeckPresentation(1, 'desktop')).toEqual('fullbleed');
  });

  test('a singleton active deck renders fullbleed on tablet', () => {
    expect(getDeckPresentation(1, 'tablet')).toEqual('fullbleed');
  });

  test('two or more active planks render sliding on desktop', () => {
    expect(getDeckPresentation(2, 'desktop')).toEqual('sliding');
    expect(getDeckPresentation(5, 'desktop')).toEqual('sliding');
  });

  test('mobile always renders sliding, regardless of plank count', () => {
    expect(getDeckPresentation(0, 'mobile')).toEqual('sliding');
    expect(getDeckPresentation(1, 'mobile')).toEqual('sliding');
    expect(getDeckPresentation(2, 'mobile')).toEqual('sliding');
  });

  test('zero active planks render sliding (empty stack) off mobile', () => {
    expect(getDeckPresentation(0, 'desktop')).toEqual('sliding');
  });
});

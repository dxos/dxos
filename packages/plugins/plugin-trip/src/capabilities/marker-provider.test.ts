//
// Copyright 2026 DXOS.org
//

import { describe, test } from 'vitest';

import { toLatLng } from './marker-provider';

describe('toLatLng', () => {
  test('converts a [lng, lat] tuple', ({ expect }) => {
    expect(toLatLng([-0.1276, 51.5074])).toEqual({ lng: -0.1276, lat: 51.5074 });
  });

  test('ignores the optional height element', ({ expect }) => {
    expect(toLatLng([2.1734, 41.3851, 12])).toEqual({ lng: 2.1734, lat: 41.3851 });
  });

  // Regression: a GeoPoint read from a live ECHO object is an array-like tuple proxy that is NOT
  // iterable. Destructuring (`const [lng, lat] = geo`) throws "geo is not iterable" on it; index
  // access must be used.
  test('handles a non-iterable array-like (ECHO tuple proxy)', ({ expect }) => {
    const proxy: ArrayLike<number> = { 0: -2.3597, 1: 51.3781, length: 2 };
    expect(toLatLng(proxy)).toEqual({ lng: -2.3597, lat: 51.3781 });
  });

  test('returns undefined when absent or incomplete', ({ expect }) => {
    expect(toLatLng(undefined)).toBeUndefined();
    expect(toLatLng([1])).toBeUndefined();
  });
});

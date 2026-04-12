//
// Copyright 2026 DXOS.org
//

import { describe, test } from 'vitest';

import { axialToPixel, pixelToAxial } from './axial';

describe('axialToPixel', () => {
  describe('square grid', () => {
    test('origin maps to (0,0)', ({ expect }) => {
      expect(axialToPixel(0, 0, 'square', 50)).toEqual({ x: 0, y: 0 });
    });

    test('(3,2) with size 50 maps to (150,100)', ({ expect }) => {
      expect(axialToPixel(3, 2, 'square', 50)).toEqual({ x: 150, y: 100 });
    });
  });

  describe('hex grid', () => {
    test('origin maps to (0,0)', ({ expect }) => {
      expect(axialToPixel(0, 0, 'hex', 50)).toEqual({ x: 0, y: 0 });
    });

    test('(1,0) with size 50 has x≈75 and y≈43.301', ({ expect }) => {
      const point = axialToPixel(1, 0, 'hex', 50);
      expect(point.x).toBeCloseTo(75, 3);
      expect(point.y).toBeCloseTo(43.301, 3);
    });
  });

  describe('triangle grid', () => {
    test('origin maps to (0,0)', ({ expect }) => {
      expect(axialToPixel(0, 0, 'triangle', 50)).toEqual({ x: 0, y: 0 });
    });

    test('(1,0) with size 50 has x≈25 and y≈0', ({ expect }) => {
      const point = axialToPixel(1, 0, 'triangle', 50);
      expect(point.x).toBeCloseTo(25, 3);
      expect(point.y).toBeCloseTo(0, 3);
    });
  });
});

describe('pixelToAxial round-trip', () => {
  test('square grid round-trip', ({ expect }) => {
    const coord = { q: 3, r: 2 };
    const pixel = axialToPixel(coord.q, coord.r, 'square', 50);
    expect(pixelToAxial(pixel.x, pixel.y, 'square', 50)).toEqual(coord);
  });

  test('hex grid round-trip', ({ expect }) => {
    const coord = { q: 2, r: 1 };
    const pixel = axialToPixel(coord.q, coord.r, 'hex', 50);
    const result = pixelToAxial(pixel.x, pixel.y, 'hex', 50);
    expect(result).toEqual(coord);
  });

  test('triangle grid round-trip', ({ expect }) => {
    const coord = { q: 4, r: 3 };
    const pixel = axialToPixel(coord.q, coord.r, 'triangle', 50);
    expect(pixelToAxial(pixel.x, pixel.y, 'triangle', 50)).toEqual(coord);
  });
});

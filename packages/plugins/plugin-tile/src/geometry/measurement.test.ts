//
// Copyright 2026 DXOS.org
//

import { describe, test } from 'vitest';

import { gridToPhysical, fitToRoom } from './measurement';

describe('gridToPhysical', () => {
  describe('square grid', () => {
    test('10×10 tiles of 50mm with 2mm grout → 518mm each dimension', ({ expect }) => {
      const result = gridToPhysical(50, 2, 10, 10, 'square');
      expect(result.widthMm).toBe(518);
      expect(result.heightMm).toBe(518);
    });

    test('zero grout: 5 tiles × 100mm = 500mm', ({ expect }) => {
      const result = gridToPhysical(100, 0, 5, 5, 'square');
      expect(result.widthMm).toBe(500);
      expect(result.heightMm).toBe(500);
    });

    test('rectangular grid: 3 wide × 2 tall with 50mm tiles and 5mm grout', ({ expect }) => {
      // width: 3*50 + 2*5 = 160, height: 2*50 + 1*5 = 105
      const result = gridToPhysical(50, 5, 3, 2, 'square');
      expect(result.widthMm).toBe(160);
      expect(result.heightMm).toBe(105);
    });

    test('single tile has no grout gaps', ({ expect }) => {
      const result = gridToPhysical(75, 3, 1, 1, 'square');
      expect(result.widthMm).toBe(75);
      expect(result.heightMm).toBe(75);
    });
  });

  describe('hex grid', () => {
    test('returns positive dimensions', ({ expect }) => {
      const result = gridToPhysical(50, 2, 5, 5, 'hex');
      expect(result.widthMm).toBeGreaterThan(0);
      expect(result.heightMm).toBeGreaterThan(0);
    });

    test('larger grid is bigger than smaller grid', ({ expect }) => {
      const small = gridToPhysical(50, 2, 3, 3, 'hex');
      const large = gridToPhysical(50, 2, 6, 6, 'hex');
      expect(large.widthMm).toBeGreaterThan(small.widthMm);
      expect(large.heightMm).toBeGreaterThan(small.heightMm);
    });
  });

  describe('triangle grid', () => {
    test('returns positive dimensions', ({ expect }) => {
      const result = gridToPhysical(50, 2, 8, 4, 'triangle');
      expect(result.widthMm).toBeGreaterThan(0);
      expect(result.heightMm).toBeGreaterThan(0);
    });

    test('larger grid is bigger than smaller grid', ({ expect }) => {
      const small = gridToPhysical(50, 2, 4, 4, 'triangle');
      const large = gridToPhysical(50, 2, 8, 8, 'triangle');
      expect(large.widthMm).toBeGreaterThan(small.widthMm);
      expect(large.heightMm).toBeGreaterThan(small.heightMm);
    });
  });
});

describe('fitToRoom', () => {
  describe('square grid', () => {
    test('1000mm room with 100mm tiles + 2mm grout → 9 tiles', ({ expect }) => {
      // 9 tiles: 9*100 + 8*2 = 916 ≤ 1000; 10 tiles: 10*100 + 9*2 = 1018 > 1000
      const result = fitToRoom(1000, 1000, 100, 2, 'square');
      expect(result.gridWidth).toBe(9);
      expect(result.gridHeight).toBe(9);
    });

    test('exact fit: 500mm room with 100mm tiles + 0mm grout → 5 tiles', ({ expect }) => {
      const result = fitToRoom(500, 500, 100, 0, 'square');
      expect(result.gridWidth).toBe(5);
      expect(result.gridHeight).toBe(5);
    });

    test('minimum 1 tile even for very small rooms', ({ expect }) => {
      const result = fitToRoom(10, 10, 100, 2, 'square');
      expect(result.gridWidth).toBe(1);
      expect(result.gridHeight).toBe(1);
    });

    test('non-square room returns different width and height', ({ expect }) => {
      // width: floor((2000 + 2) / 102) = floor(2002/102) = 19
      // height: floor((500 + 2) / 102) = floor(502/102) = 4
      const result = fitToRoom(2000, 500, 100, 2, 'square');
      expect(result.gridWidth).toBeGreaterThan(result.gridHeight);
    });
  });

  describe('hex grid', () => {
    test('returns positive values', ({ expect }) => {
      const result = fitToRoom(1000, 1000, 50, 2, 'hex');
      expect(result.gridWidth).toBeGreaterThan(0);
      expect(result.gridHeight).toBeGreaterThan(0);
    });

    test('minimum 1 tile even for very small rooms', ({ expect }) => {
      const result = fitToRoom(5, 5, 100, 2, 'hex');
      expect(result.gridWidth).toBeGreaterThanOrEqual(1);
      expect(result.gridHeight).toBeGreaterThanOrEqual(1);
    });

    test('larger room fits more tiles', ({ expect }) => {
      const small = fitToRoom(500, 500, 50, 2, 'hex');
      const large = fitToRoom(2000, 2000, 50, 2, 'hex');
      expect(large.gridWidth).toBeGreaterThan(small.gridWidth);
      expect(large.gridHeight).toBeGreaterThan(small.gridHeight);
    });
  });

  describe('triangle grid', () => {
    test('returns positive values', ({ expect }) => {
      const result = fitToRoom(1000, 1000, 50, 2, 'triangle');
      expect(result.gridWidth).toBeGreaterThan(0);
      expect(result.gridHeight).toBeGreaterThan(0);
    });

    test('minimum 1 tile even for very small rooms', ({ expect }) => {
      const result = fitToRoom(5, 5, 100, 2, 'triangle');
      expect(result.gridWidth).toBeGreaterThanOrEqual(1);
      expect(result.gridHeight).toBeGreaterThanOrEqual(1);
    });
  });
});

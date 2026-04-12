//
// Copyright 2026 DXOS.org
//

import { describe, test } from 'vitest';

import { visibleRange } from './viewport';

describe('visibleRange', () => {
  describe('square grid', () => {
    test('returns range covering all tiles in viewport', ({ expect }) => {
      const range = visibleRange({ x: 0, y: 0, width: 200, height: 100 }, 'square', 50);
      // qMin = floor(0/50) - 1 = -1, qMax = ceil(200/50) + 1 = 5
      // rMin = floor(0/50) - 1 = -1, rMax = ceil(100/50) + 1 = 3
      expect(range.qMin).toBe(-1);
      expect(range.qMax).toBe(5);
      expect(range.rMin).toBe(-1);
      expect(range.rMax).toBe(3);
    });

    test('covers correct tile count for given viewport', ({ expect }) => {
      const range = visibleRange({ x: 0, y: 0, width: 300, height: 150 }, 'square', 50);
      const qCount = range.qMax - range.qMin + 1;
      const rCount = range.rMax - range.rMin + 1;
      // qMin=floor(0/50)-1=-1, qMax=ceil(300/50)+1=7 → count=9
      // rMin=floor(0/50)-1=-1, rMax=ceil(150/50)+1=4 → count=6
      expect(qCount).toBe(9);
      expect(rCount).toBe(6);
    });

    test('panned viewport shifts range accordingly', ({ expect }) => {
      const tileSize = 50;
      // Viewport panned by 5 tiles in x, 2 tiles in y
      const range = visibleRange({ x: 250, y: 100, width: 200, height: 100 }, 'square', tileSize);
      // qMin = floor(250/50) - 1 = 5-1 = 4
      // qMax = ceil((250+200)/50) + 1 = ceil(9) + 1 = 10
      expect(range.qMin).toBe(4);
      expect(range.qMax).toBe(10);
      // rMin = floor(100/50) - 1 = 2-1 = 1
      // rMax = ceil((100+100)/50) + 1 = ceil(4) + 1 = 5
      expect(range.rMin).toBe(1);
      expect(range.rMax).toBe(5);
    });

    test('negative viewport origin handled correctly', ({ expect }) => {
      const range = visibleRange({ x: -100, y: -50, width: 200, height: 100 }, 'square', 50);
      // qMin = floor(-100/50) - 1 = -2 - 1 = -3
      expect(range.qMin).toBe(-3);
      // rMin = floor(-50/50) - 1 = -1 - 1 = -2
      expect(range.rMin).toBe(-2);
    });
  });

  describe('hex grid', () => {
    test('returns a valid range with qMin < qMax and rMin < rMax', ({ expect }) => {
      const range = visibleRange({ x: 0, y: 0, width: 400, height: 300 }, 'hex', 50);
      expect(range.qMin).toBeLessThan(range.qMax);
      expect(range.rMin).toBeLessThan(range.rMax);
    });

    test('hex range is wider than viewport width / colWidth (plus buffer)', ({ expect }) => {
      const tileSize = 50;
      const colWidth = tileSize * (3 / 2); // 75
      const range = visibleRange({ x: 0, y: 0, width: 300, height: 200 }, 'hex', tileSize);
      const qCount = range.qMax - range.qMin;
      // Minimum columns needed: ceil(300/75) = 4; with 2 buffer = at least 6
      expect(qCount).toBeGreaterThanOrEqual(6);
    });

    test('panned hex viewport shifts range', ({ expect }) => {
      const tileSize = 50;
      const colWidth = tileSize * (3 / 2); // 75
      const range0 = visibleRange({ x: 0, y: 0, width: 300, height: 200 }, 'hex', tileSize);
      const rangeShifted = visibleRange({ x: colWidth * 5, y: 0, width: 300, height: 200 }, 'hex', tileSize);
      // Shifted range should be offset by 5 columns
      expect(rangeShifted.qMin).toBe(range0.qMin + 5);
      expect(rangeShifted.qMax).toBe(range0.qMax + 5);
    });
  });

  describe('triangle grid', () => {
    test('returns a valid range with qMin < qMax and rMin < rMax', ({ expect }) => {
      const range = visibleRange({ x: 0, y: 0, width: 400, height: 300 }, 'triangle', 50);
      expect(range.qMin).toBeLessThan(range.qMax);
      expect(range.rMin).toBeLessThan(range.rMax);
    });

    test('triangle range is wider than viewport width / colWidth (plus buffer)', ({ expect }) => {
      const tileSize = 50;
      const colWidth = tileSize / 2; // 25
      const range = visibleRange({ x: 0, y: 0, width: 300, height: 200 }, 'triangle', tileSize);
      const qCount = range.qMax - range.qMin;
      // Minimum columns: ceil(300/25) = 12; with 2 buffer = at least 14
      expect(qCount).toBeGreaterThanOrEqual(14);
    });
  });
});

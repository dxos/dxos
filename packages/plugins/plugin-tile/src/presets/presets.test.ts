//
// Copyright 2026 DXOS.org
//

import { describe, test } from 'vitest';

import { applyPreset, listPresets } from './presets';

describe('listPresets', () => {
  test('returns at least 4 presets', ({ expect }) => {
    const presets = listPresets();
    expect(presets.length).toBeGreaterThanOrEqual(4);
  });

  test('includes checkerboard and herringbone', ({ expect }) => {
    const presets = listPresets();
    const keys = presets.map((p) => p.key);
    expect(keys).toContain('checkerboard');
    expect(keys).toContain('herringbone');
  });

  test('each preset has key, name, and gridTypes', ({ expect }) => {
    const presets = listPresets();
    for (const preset of presets) {
      expect(preset.key).toBeTruthy();
      expect(preset.name).toBeTruthy();
      expect(Array.isArray(preset.gridTypes)).toBe(true);
      expect(preset.gridTypes.length).toBeGreaterThan(0);
    }
  });
});

describe('applyPreset checkerboard', () => {
  test('fills all 16 cells on a 4x4 grid', ({ expect }) => {
    const cells = applyPreset('checkerboard', 'square', 4, 4, 2);
    expect(Object.keys(cells).length).toBe(16);
  });

  test('produces alternating indices', ({ expect }) => {
    const cells = applyPreset('checkerboard', 'square', 4, 4, 2);
    expect(cells['0,0']).toBe(0);
    expect(cells['1,0']).toBe(1);
    expect(cells['0,1']).toBe(1);
    expect(cells['1,1']).toBe(0);
  });

  test('uses only valid indices', ({ expect }) => {
    const cells = applyPreset('checkerboard', 'square', 4, 4, 2);
    for (const value of Object.values(cells)) {
      expect(value).toBeGreaterThanOrEqual(0);
      expect(value).toBeLessThan(2);
    }
  });
});

describe('applyPreset herringbone', () => {
  test('generates cells for a 6x6 grid', ({ expect }) => {
    const cells = applyPreset('herringbone', 'square', 6, 6, 2);
    expect(Object.keys(cells).length).toBe(36);
  });

  test('uses only valid indices', ({ expect }) => {
    const cells = applyPreset('herringbone', 'square', 6, 6, 2);
    for (const value of Object.values(cells)) {
      expect(value).toBeGreaterThanOrEqual(0);
      expect(value).toBeLessThan(2);
    }
  });
});

describe('applyPreset honeycomb', () => {
  test('works on hex grid 5x5 with 3 colors', ({ expect }) => {
    const cells = applyPreset('honeycomb', 'hex', 5, 5, 3);
    expect(Object.keys(cells).length).toBe(25);
  });

  test('uses only valid indices', ({ expect }) => {
    const cells = applyPreset('honeycomb', 'hex', 5, 5, 3);
    for (const value of Object.values(cells)) {
      expect(value).toBeGreaterThanOrEqual(0);
      expect(value).toBeLessThan(3);
    }
  });
});

describe('applyPreset diamond', () => {
  test('fills all cells on a 6x6 grid', ({ expect }) => {
    const cells = applyPreset('diamond', 'square', 6, 6, 3);
    expect(Object.keys(cells).length).toBe(36);
  });

  test('uses only valid indices', ({ expect }) => {
    const cells = applyPreset('diamond', 'square', 6, 6, 3);
    for (const value of Object.values(cells)) {
      expect(value).toBeGreaterThanOrEqual(0);
      expect(value).toBeLessThan(3);
    }
  });
});

describe('applyPreset basketweave', () => {
  test('fills all cells on a 4x4 grid', ({ expect }) => {
    const cells = applyPreset('basketweave', 'square', 4, 4, 2);
    expect(Object.keys(cells).length).toBe(16);
  });

  test('uses only valid indices', ({ expect }) => {
    const cells = applyPreset('basketweave', 'square', 4, 4, 2);
    for (const value of Object.values(cells)) {
      expect(value).toBeGreaterThanOrEqual(0);
      expect(value).toBeLessThan(2);
    }
  });
});

describe('applyPreset pinwheel', () => {
  test('fills all cells on a 4x4 grid', ({ expect }) => {
    const cells = applyPreset('pinwheel', 'triangle', 4, 4, 4);
    expect(Object.keys(cells).length).toBe(16);
  });

  test('uses only valid indices', ({ expect }) => {
    const cells = applyPreset('pinwheel', 'triangle', 4, 4, 4);
    for (const value of Object.values(cells)) {
      expect(value).toBeGreaterThanOrEqual(0);
      expect(value).toBeLessThan(4);
    }
  });
});

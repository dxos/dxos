//
// Copyright 2026 DXOS.org
//

import { describe, expect, test } from 'vitest';

import { classify, type ClimateConfig } from './biomes';
import { colorFor, oceanColor } from './palette';

const climate: ClimateConfig = {
  waterLevel: 0.44,
  beachWidth: 0.05,
  treeLine: 0.55,
  poles: false,
  snowLine: 0.82,
  snowElevation: 0.78,
};

describe('biomes', () => {
  test('below water level is ocean', () => {
    expect(classify(climate, 0.2, 0.1, 0.5)).toBe('ocean');
  });
  test('high latitude is snow only when poles enabled', () => {
    expect(classify(climate, 0.6, 0.9, 0.5)).not.toBe('snow'); // poles off.
    expect(classify({ ...climate, poles: true }, 0.6, 0.9, 0.5)).toBe('snow');
  });
  test('mountain-elevation snow applies regardless of poles', () => {
    expect(classify(climate, 0.95, 0.1, 0.5)).toBe('snow'); // rel > snowElevation.
  });
  test('just above water is beach', () => {
    expect(classify(climate, 0.46, 0.1, 0.5)).toBe('beach');
  });
  test('moist mid-elevation is forest, dry is grass', () => {
    expect(classify(climate, 0.6, 0.1, 0.8)).toBe('forest');
    expect(classify(climate, 0.6, 0.1, 0.2)).toBe('grass');
  });
  test('ocean color darkens with depth', () => {
    const shallow = oceanColor(0.43, 0.44);
    const deep = oceanColor(0.05, 0.44);
    expect(deep[2]).toBeLessThan(shallow[2]);
  });
  test('colorFor routes ocean through depth shading', () => {
    expect(colorFor('ocean', 0.1, 0.44)).toEqual(oceanColor(0.1, 0.44));
  });
});

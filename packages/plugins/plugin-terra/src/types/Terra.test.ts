//
// Copyright 2026 DXOS.org
//

import { describe, expect, test } from 'vitest';

import { generatePlanet } from '../engine';
import { Terra } from './index';

describe('Terra', () => {
  test('make() applies defaults and a seed', () => {
    const terra = Terra.make({ name: 'World', config: { seed: 'abc' } });
    expect(terra.name).toBe('World');
    expect(terra.config.seed).toBe('abc');
    expect(terra.config.waterLevel).toBeGreaterThan(0);
  });

  test('toConfigValues produces a valid engine config', () => {
    const terra = Terra.make({ config: { seed: 'abc' } });
    const values = Terra.toConfigValues(terra);
    expect(() => generatePlanet({ ...values, resolution: 8 })).not.toThrow();
  });
});

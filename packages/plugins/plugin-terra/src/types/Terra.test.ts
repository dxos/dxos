//
// Copyright 2026 DXOS.org
//

import { describe, expect, test } from 'vitest';

import { generatePlanet } from '../engine';
import { toUnit } from '../sim/geo';
import { buildNavGrid, isPassable } from '../sim/nav-grid';
import { planRoute } from '../sim/route';
import { Terra, TerraObject } from './index';

/** Resolves `terra.objects` (an array of refs) to their loaded definitions. */
const resolveDefinitions = (terra: Terra.Terra): TerraObject.TerraObject[] =>
  terra.objects
    .map((ref) => ref.target)
    .filter((definition): definition is TerraObject.TerraObject => definition != null);

describe('Terra', () => {
  test('make() applies defaults and a seed', () => {
    const terra = Terra.make({ name: 'World', config: { seed: 'abc' } });
    expect(terra.name).toBe('World');
    expect(terra.config.seed).toBe('abc');
    expect(terra.config.waterLevel).toBeGreaterThan(0);
    expect(terra.objects).toHaveLength(0);
  });

  test('toConfigValues produces a valid engine config', () => {
    const terra = Terra.make({ config: { seed: 'abc' } });
    const values = Terra.toConfigValues(terra);
    expect(() => generatePlanet({ ...values, resolution: 8 })).not.toThrow();
  });

  describe('makeDemoWorld', () => {
    test('seeds exactly two objects of each kind', () => {
      const terra = Terra.makeDemoWorld({ config: { seed: 'demo-1' } });
      const definitions = resolveDefinitions(terra);
      expect(definitions).toHaveLength(10);

      const kinds: TerraObject.Kind[] = ['boat', 'plane', 'satellite', 'tank', 'rocket'];
      for (const kind of kinds) {
        expect(definitions.filter((definition) => definition.kind === kind)).toHaveLength(2);
      }
    });

    test('boat sources land on sea cells and tank sources on land cells', () => {
      const terra = Terra.makeDemoWorld({ config: { seed: 'demo-1' } });
      const grid = buildNavGrid(Terra.toConfigValues(terra));
      const definitions = resolveDefinitions(terra);

      const boats = definitions.filter((definition) => definition.kind === 'boat');
      expect(boats).toHaveLength(2);
      for (const boat of boats) {
        if (!boat.source) {
          throw new Error('demo boat is missing a source');
        }
        const index = grid.findNearest(toUnit(boat.source));
        expect(isPassable(grid, index, 'sea')).toBe(true);
      }

      const tanks = definitions.filter((definition) => definition.kind === 'tank');
      expect(tanks).toHaveLength(2);
      for (const tank of tanks) {
        if (!tank.source) {
          throw new Error('demo tank is missing a source');
        }
        const index = grid.findNearest(toUnit(tank.source));
        expect(isPassable(grid, index, 'land')).toBe(true);
      }
    });

    test('routed objects (boat, tank, plane) have a non-empty route between their source and target', () => {
      const terra = Terra.makeDemoWorld({ config: { seed: 'demo-1' } });
      const grid = buildNavGrid(Terra.toConfigValues(terra));
      const definitions = resolveDefinitions(terra);

      for (const definition of definitions) {
        if (definition.kind !== 'boat' && definition.kind !== 'tank' && definition.kind !== 'plane') {
          continue;
        }
        if (!definition.source || !definition.target) {
          throw new Error(`demo ${definition.kind} is missing a source or target`);
        }
        const domain = TerraObject.domainFor(definition.kind);
        const route = planRoute({
          grid,
          domain,
          from: toUnit(definition.source),
          to: toUnit(definition.target),
        });
        expect(route.length).toBeGreaterThan(0);
      }
    });

    test('two calls with the same seed produce identical placements', () => {
      const geoOf = (terra: Terra.Terra) =>
        resolveDefinitions(terra).map((definition) => ({
          kind: definition.kind,
          source: definition.source,
          target: definition.target,
          orbit: definition.orbit,
        }));

      const first = Terra.makeDemoWorld({ config: { seed: 'demo-2' } });
      const second = Terra.makeDemoWorld({ config: { seed: 'demo-2' } });
      expect(geoOf(first)).toEqual(geoOf(second));
    });
  });
});

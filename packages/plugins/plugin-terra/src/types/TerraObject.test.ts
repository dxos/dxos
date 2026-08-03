//
// Copyright 2026 DXOS.org
//

import { describe, expect, test } from 'vitest';

import { TerraObject } from './index';

describe('TerraObject', () => {
  test('make() builds a routed object', () => {
    const boat = TerraObject.make({
      kind: 'boat',
      name: 'Nimbus',
      speed: 0.02,
      source: { lat: 10, lng: 20, height: 0 },
      target: { lat: -5, lng: 40, height: 0 },
      spawnedAt: 1000,
    });
    expect(boat.kind).toBe('boat');
    expect(boat.name).toBe('Nimbus');
    expect(boat.source?.lat).toBe(10);
    expect(boat.spawnedAt).toBe(1000);
  });

  test('make() builds an orbiting object', () => {
    const satellite = TerraObject.make({
      kind: 'satellite',
      speed: 0,
      orbit: { altitude: 0.5, inclination: 45, phase: 0, period: 60 },
      spawnedAt: 0,
    });
    expect(satellite.orbit?.inclination).toBe(45);
  });

  test('domainFor maps each kind to its medium', () => {
    expect(TerraObject.domainFor('boat')).toBe('sea');
    expect(TerraObject.domainFor('tank')).toBe('land');
    expect(TerraObject.domainFor('plane')).toBe('air');
    expect(TerraObject.domainFor('rocket')).toBe('air');
    expect(TerraObject.domainFor('satellite')).toBe('air');
  });
});

//
// Copyright 2026 DXOS.org
//

// @import-as-namespace

import * as Schema from 'effect/Schema';

import { Annotation, DXN, Obj, Ref, Type } from '@dxos/echo';
import { FormInputAnnotation, LabelAnnotation } from '@dxos/echo/Annotation';

import { type TerraConfigValues } from '../engine';
import { type Domain, type NavCell, type NavGrid, buildNavGrid, domainCandidates, toGeo } from '../sim';
import * as TerraObject from './TerraObject';

/** Deterministic parameters for a Terra world. All fields optional so a bare seed works. */
export const TerraConfig = Schema.Struct({
  seed: Schema.optional(Schema.String.annotations({ title: 'Seed' })),
  resolution: Schema.optional(Schema.Number.annotations({ title: 'Resolution' })),
  elevationScale: Schema.optional(Schema.Number.annotations({ title: 'Elevation scale' })),
  frequency: Schema.optional(Schema.Number),
  octaves: Schema.optional(Schema.Number),
  persistence: Schema.optional(Schema.Number),
  lacunarity: Schema.optional(Schema.Number),
  continentPower: Schema.optional(Schema.Number),
  mountainScale: Schema.optional(Schema.Number.annotations({ title: 'Mountain scale' })),
  maskFrequency: Schema.optional(Schema.Number),
  maskThreshold: Schema.optional(Schema.Number),
  waterLevel: Schema.optional(Schema.Number.annotations({ title: 'Water level' })),
  landGain: Schema.optional(Schema.Number),
  oceanDepthBias: Schema.optional(Schema.Number),
  beachWidth: Schema.optional(Schema.Number),
  treeLine: Schema.optional(Schema.Number),
  poles: Schema.optional(Schema.Boolean),
  snowLine: Schema.optional(Schema.Number),
  snowElevation: Schema.optional(Schema.Number),
  treeDensity: Schema.optional(Schema.Number.annotations({ title: 'Tree density' })),
  rockDensity: Schema.optional(Schema.Number),
  trees: Schema.optional(Schema.Boolean),
  rocks: Schema.optional(Schema.Boolean),
});

export type TerraConfig = Schema.Schema.Type<typeof TerraConfig>;

/** A Terra world storing generation parameters; `Terra.toConfigValues` merges them over defaults for the engine. */
export class Terra extends Type.makeObject<Terra>(DXN.make('org.dxos.type.terra', '0.1.0'))(
  Schema.Struct({
    name: Schema.optional(Schema.String),
    config: TerraConfig,
    objects: Ref.Ref(TerraObject.TerraObject).pipe(Schema.Array, FormInputAnnotation.set(false)),
  }).pipe(
    LabelAnnotation.set(['name']),
    Annotation.IconAnnotation.set({ icon: 'ph--globe-hemisphere-west--regular', hue: 'green' }),
  ),
) {}

/** Default generation parameters (spike-validated). `radius` is fixed for the orbit view and excluded from `TerraConfig`. */
export const defaultConfig = (): Required<Omit<TerraConfigValues, 'seed'>> & { seed: string } => ({
  seed: 'terra',
  radius: 2,
  resolution: 256,
  elevationScale: 0.08,
  frequency: 0.9,
  octaves: 6,
  persistence: 0.5,
  lacunarity: 2.0,
  continentPower: 1.35,
  mountainScale: 0.75,
  maskFrequency: 0.9,
  maskThreshold: 0.42,
  waterLevel: 0.5,
  landGain: 2.5,
  oceanDepthBias: 0.6,
  beachWidth: 0.05,
  treeLine: 0.55,
  poles: false,
  snowLine: 0.82,
  snowElevation: 0.78,
  treeDensity: 0.1,
  rockDensity: 0.1,
  trees: true,
  rocks: true,
});

/** Merges a partial config over `defaultConfig`'s non-`radius` fields, producing a complete stored `TerraConfig`. */
const buildConfig = (config?: Partial<TerraConfig>): TerraConfig => {
  const { radius: _radius, ...configDefaults } = defaultConfig();
  return { ...configDefaults, ...config };
};

/** Merges a stored (or partial) config over defaults to produce a complete engine config. `radius` is fixed. */
const mergeConfigValues = (config: Partial<TerraConfig> | undefined): TerraConfigValues => {
  const defaults = defaultConfig();
  return {
    ...defaults,
    ...Object.fromEntries(Object.entries(config ?? {}).filter(([, value]) => value !== undefined)),
  };
};

/** Creates a Terra object with defaults filled in and no seeded objects. */
export const make = (props?: { name?: string; config?: Partial<TerraConfig> }): Terra =>
  Obj.make(Terra, { name: props?.name, config: buildConfig(props?.config), objects: [] });

/** Merges stored config over defaults to produce a complete engine config. `radius` is fixed. */
export const toConfigValues = (terra: Terra): TerraConfigValues => mergeConfigValues(terra.config);

type GeoPoint = Schema.Schema.Type<typeof TerraObject.GeoPointSchema>;
type Orbit = Schema.Schema.Type<typeof TerraObject.Orbit>;

/** `count` cells spread evenly across `cells` (sorted by grid index), for endpoints that land well apart. */
const spread = (cells: readonly NavCell[], count: number): NavCell[] => {
  const sorted = [...cells].sort((left, right) => left.index - right.index);
  // `count - 1` is the stride denominator, so a single cell would divide by zero.
  if (count <= 1) {
    return sorted.slice(0, count);
  }
  return Array.from({ length: count }, (_, index) => sorted[Math.floor((index * (sorted.length - 1)) / (count - 1))]);
};

/** `count` source/target pairs for `domain`, each endpoint drawn from the same connected component so it is reachable. */
const demoPairs = (grid: NavGrid, domain: Domain, count: number): Array<{ source: GeoPoint; target: GeoPoint }> => {
  const candidates = domainCandidates(grid, domain);
  if (candidates.length < count * 2) {
    throw new Error(`makeDemoWorld: not enough safe ${domain} cells for ${count} pairs.`);
  }
  const endpoints = spread(candidates, count * 2);
  return Array.from({ length: count }, (_, index) => ({
    source: { ...toGeo(endpoints[index * 2].unit), height: 0 },
    target: { ...toGeo(endpoints[index * 2 + 1].unit), height: 0 },
  }));
};

/** One random source/target pair for `domain`, drawn from the same reachable candidates `demoPairs` uses — for a single ad hoc placement rather than an evenly-spread set. */
const randomPair = (grid: NavGrid, domain: Domain): { source: GeoPoint; target: GeoPoint } => {
  const candidates = domainCandidates(grid, domain);
  if (candidates.length < 2) {
    throw new Error(`makeRandomObject: not enough safe ${domain} cells for a pair.`);
  }
  const sourceIndex = Math.floor(Math.random() * candidates.length);
  const targetIndex = (sourceIndex + 1 + Math.floor(Math.random() * (candidates.length - 1))) % candidates.length;
  return {
    source: { ...toGeo(candidates[sourceIndex].unit), height: 0 },
    target: { ...toGeo(candidates[targetIndex].unit), height: 0 },
  };
};

/** Long, seed-independent separations: air routing has no terrain dependency, so fixed geo pairs work for any seed. */
const PLANE_PAIRS: Array<{ source: GeoPoint; target: GeoPoint }> = [
  { source: { lat: 35, lng: -100, height: 0 }, target: { lat: 10, lng: 120, height: 0 } },
  { source: { lat: -20, lng: 30, height: 0 }, target: { lat: 45, lng: -60, height: 0 } },
  { source: { lat: 55, lng: 15, height: 0 }, target: { lat: -30, lng: 150, height: 0 } },
  { source: { lat: -10, lng: -70, height: 0 }, target: { lat: 50, lng: 100, height: 0 } },
];

const ROCKET_PAIRS: Array<{ source: GeoPoint; target: GeoPoint }> = [
  { source: { lat: 0, lng: 0, height: 0 }, target: { lat: 60, lng: 170, height: 0 } },
  { source: { lat: -45, lng: -90, height: 0 }, target: { lat: 40, lng: 90, height: 0 } },
  { source: { lat: 25, lng: 60, height: 0 }, target: { lat: -55, lng: -20, height: 0 } },
  { source: { lat: -15, lng: 175, height: 0 }, target: { lat: 35, lng: -45, height: 0 } },
];

/** Distinct inclinations, altitudes, phases, and periods so the orbits never overlap visually. */
const SATELLITE_ORBITS: Orbit[] = [
  { altitude: 0.5, inclination: 28, phase: 0, period: 90 },
  { altitude: 0.9, inclination: 97, phase: Math.PI / 2, period: 140 },
  { altitude: 0.7, inclination: 55, phase: Math.PI, period: 110 },
  { altitude: 1.2, inclination: 145, phase: Math.PI * 1.5, period: 180 },
];

const BOAT_SPEED = 0.02;
const TANK_SPEED = 0.01;
const PLANE_SPEED = 0.03;
const ROCKET_SPEED = 0.05;

/** Builds `pairs.length` objects of `kind`, named `<kind>-<n>`, spawned at `0`. */
const objectsFromPairs = (
  kind: 'boat' | 'tank' | 'plane' | 'rocket',
  pairs: readonly { source: GeoPoint; target: GeoPoint }[],
  speed: number,
): TerraObject.TerraObject[] =>
  pairs.map((pair, index) =>
    TerraObject.make({
      kind,
      name: `${kind}-${index + 1}`,
      speed,
      source: pair.source,
      target: pair.target,
      spawnedAt: 0,
    }),
  );

/**
 * A Terra world seeded with two objects of each kind: boats and tanks placed on this seed's own
 * sea/land via the nav grid (so the demo works for any seed), planes and rockets on fixed
 * long-separation geo pairs, and two satellites on differing orbits. Deterministic — no
 * `Math.random()` anywhere in the derivation.
 */
export const makeDemoWorld = (props?: { name?: string; config?: Partial<TerraConfig> }): Terra => {
  const config = buildConfig(props?.config);
  const values = mergeConfigValues(config);
  const grid = buildNavGrid(values);

  const definitions: TerraObject.TerraObject[] = [
    ...objectsFromPairs('boat', demoPairs(grid, 'sea', 4), BOAT_SPEED),
    ...objectsFromPairs('tank', demoPairs(grid, 'land', 4), TANK_SPEED),
    ...objectsFromPairs('plane', PLANE_PAIRS, PLANE_SPEED),
    ...objectsFromPairs('rocket', ROCKET_PAIRS, ROCKET_SPEED),
    ...SATELLITE_ORBITS.map((orbit, index) =>
      TerraObject.make({ kind: 'satellite', name: `satellite-${index + 1}`, speed: 0, orbit, spawnedAt: 0 }),
    ),
  ];

  const terra = Obj.make(Terra, {
    name: props?.name,
    config,
    objects: definitions.map((definition) => Ref.make(definition)),
  });
  definitions.forEach((definition) => Obj.setParent(definition, terra));
  return terra;
};

/** Every kind `makeRandomObject` may pick, one weight each. */
const RANDOM_KINDS: readonly TerraObject.Kind[] = ['boat', 'tank', 'plane', 'rocket', 'satellite'];

const SPEED_BY_KIND: Record<Exclude<TerraObject.Kind, 'satellite'>, number> = {
  boat: BOAT_SPEED,
  tank: TANK_SPEED,
  plane: PLANE_SPEED,
  rocket: ROCKET_SPEED,
};

/** A random orbit spanning the same altitude/inclination/period ranges `SATELLITE_ORBITS` samples from. */
const randomOrbit = (): Orbit => ({
  altitude: 0.4 + Math.random() * 0.6,
  inclination: Math.random() * 180,
  phase: Math.random() * Math.PI * 2,
  period: 60 + Math.random() * 60,
});

/**
 * A single new object of a randomly chosen kind, ready to be pushed onto `terra.objects`. Boats,
 * tanks, planes, and rockets are placed via `randomPair` — the same nav-grid-derived reachability
 * logic `makeDemoWorld` uses — while satellites get a random orbit instead of a surface placement.
 * `spawnedAt` is the caller's clock origin (matching `SimEngine.evaluateAt`'s domain) so the object
 * starts moving immediately. Adding an object is a deliberate user action, not simulation state, so
 * `Math.random()` is fine here — it must never appear in `src/sim/`.
 */
export const makeRandomObject = (terra: Terra, spawnedAt: number): TerraObject.TerraObject => {
  const kind = RANDOM_KINDS[Math.floor(Math.random() * RANDOM_KINDS.length)];
  const name = `${kind}-${terra.objects.length + 1}`;

  if (kind === 'satellite') {
    return TerraObject.make({ kind, name, speed: 0, orbit: randomOrbit(), spawnedAt });
  }

  const grid = buildNavGrid(toConfigValues(terra));
  const pair = randomPair(grid, TerraObject.domainFor(kind));
  return TerraObject.make({
    kind,
    name,
    speed: SPEED_BY_KIND[kind],
    source: pair.source,
    target: pair.target,
    spawnedAt,
  });
};

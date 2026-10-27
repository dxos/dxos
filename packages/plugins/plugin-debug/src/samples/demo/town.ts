//
// Copyright 2026 DXOS.org
//

import * as Effect from 'effect/Effect';

import * as SampleSpace from '@dxos/app-toolkit/SampleSpace';
import { Database } from '@dxos/echo';
import * as Voxel from '@dxos/plugin-voxel/Voxel';

import { type Vec, box, merge, translate } from './voxels.ts';

const TYRE = 'neutral';
const GLASS = 'cyan';

export type PartKind = 'car' | 'fire-truck' | 'house' | 'tower';

/** One thing in the town, kept apart so the layout can be checked part by part. */
export type TownPart = {
  readonly kind: PartKind;
  readonly name: string;
  readonly hue: string;
  readonly voxels: ReadonlyArray<Voxel.VoxelData>;
};

/** Which side of the street a building's door faces. */
type Facing = 'north' | 'south';

/** A low racing car pointing along +x: four tyres, a chassis, a cockpit and a rear spoiler. */
const raceCar = (origin: Vec, hue: string): Voxel.VoxelData[] =>
  translate(
    merge(
      ...[1, 4].flatMap((x) => [0, 2].map((y) => box({ x, y, z: 0 }, { x: 1, y: 1, z: 1 }, TYRE))),
      box({ x: 0, y: 0, z: 1 }, { x: 6, y: 3, z: 1 }, hue),
      box({ x: 2, y: 1, z: 2 }, { x: 2, y: 1, z: 1 }, GLASS),
      box({ x: 0, y: 0, z: 2 }, { x: 1, y: 3, z: 1 }, hue),
    ),
    origin,
  );

/** A fire truck pointing along +x: a cab with a windscreen and light bar, a body, and a ladder along the roof. */
const fireTruck = (origin: Vec, hue: string): Voxel.VoxelData[] =>
  translate(
    merge(
      ...[1, 2, 7, 8].flatMap((x) => [0, 2].map((y) => box({ x, y, z: 0 }, { x: 1, y: 1, z: 1 }, TYRE))),
      box({ x: 0, y: 0, z: 1 }, { x: 10, y: 3, z: 1 }, hue),
      box({ x: 0, y: 0, z: 2 }, { x: 7, y: 3, z: 2 }, hue),
      box({ x: 7, y: 0, z: 2 }, { x: 3, y: 3, z: 2 }, (x, _y, z) => (x === 9 && z === 3 ? GLASS : hue)),
      box({ x: 8, y: 1, z: 4 }, { x: 1, y: 1, z: 1 }, 'blue'),
      box({ x: 0, y: 1, z: 4 }, { x: 8, y: 1, z: 1 }, (x) => (x % 2 === 0 ? 'neutral' : 'amber')),
    ),
    origin,
  );

/** A 6x6 house with a door and windows on the street side, under a stepped roof. */
const house = (origin: Vec, hue: string, facing: Facing): Voxel.VoxelData[] => {
  const front = facing === 'south' ? 0 : 5;
  const walls = box(
    { x: 0, y: 0, z: 0 },
    { x: 6, y: 6, z: 4 },
    (x, y, z) => {
      if (y === front && (x === 2 || x === 3) && z < 2) {
        return 'neutral';
      }
      if ((y === 0 || y === 5) && (x === 1 || x === 4) && z === 2) {
        return GLASS;
      }
      return hue;
    },
    { hollow: true },
  );
  const roof = [0, 1, 2].map((step) =>
    box({ x: step, y: step, z: 4 + step }, { x: 6 - 2 * step, y: 6 - 2 * step, z: 1 }, 'red'),
  );
  return translate(merge(walls, ...roof), origin);
};

/** A 5x5 tower block with a column of windows on every face and a flat roof. */
const tower = (origin: Vec, hue: string, storeys = 12): Voxel.VoxelData[] => {
  const walls = box(
    { x: 0, y: 0, z: 0 },
    { x: 5, y: 5, z: storeys },
    (x, y, z) => {
      const corner = (x === 0 || x === 4) && (y === 0 || y === 4);
      return !corner && z % 2 === 1 && (x === 2 || y === 2) ? GLASS : hue;
    },
    { hollow: true },
  );
  const roof = box({ x: 0, y: 0, z: storeys }, { x: 5, y: 5, z: 1 }, 'neutral');
  return translate(merge(walls, roof), origin);
};

/** Road surface along x, with a dashed yellow centre line; buildings stand on the bare grid either side. */
const STREET_LENGTH = 44;
const street = (): Voxel.VoxelData[] =>
  box({ x: -STREET_LENGTH / 2, y: -3, z: 0 }, { x: STREET_LENGTH, y: 7, z: 1 }, (x, y) =>
    y === 0 && Math.abs(x) % 4 < 2 ? 'yellow' : 'neutral',
  );

/**
 * Every vehicle and building along one street: vehicles on the road (z = 1), towers on the far side and only two houses
 * on the near side, since the editor looks from +y and anything tall there would hide the traffic.
 */
export const TOWN: ReadonlyArray<TownPart> = [
  { kind: 'car', name: 'Blue racer', hue: 'blue', voxels: raceCar({ x: -18, y: -3, z: 1 }, 'blue') },
  { kind: 'car', name: 'Yellow racer', hue: 'yellow', voxels: raceCar({ x: -4, y: -3, z: 1 }, 'yellow') },
  { kind: 'car', name: 'Purple racer', hue: 'purple', voxels: raceCar({ x: 8, y: 1, z: 1 }, 'purple') },
  { kind: 'fire-truck', name: 'Fire truck', hue: 'red', voxels: fireTruck({ x: -12, y: 1, z: 1 }, 'red') },
  { kind: 'house', name: 'Pink house', hue: 'pink', voxels: house({ x: -22, y: 5, z: 0 }, 'pink', 'south') },
  { kind: 'house', name: 'Amber house', hue: 'amber', voxels: house({ x: 16, y: 5, z: 0 }, 'amber', 'south') },
  { kind: 'house', name: 'Lime house', hue: 'lime', voxels: house({ x: -18, y: -10, z: 0 }, 'lime', 'north') },
  { kind: 'tower', name: 'Indigo tower', hue: 'indigo', voxels: tower({ x: -9, y: -10, z: 0 }, 'indigo') },
  { kind: 'house', name: 'Violet house', hue: 'violet', voxels: house({ x: 0, y: -10, z: 0 }, 'violet', 'north') },
  { kind: 'tower', name: 'Teal tower', hue: 'teal', voxels: tower({ x: 10, y: -10, z: 0 }, 'teal', 9) },
];

/**
 * The town is one voxel world rather than one object per vehicle: plugin-voxel models a world as a single voxel map
 * with no parts, so the parts live in `TOWN` and are merged into the map here.
 */
export const town = (): Voxel.VoxelData[] => merge(street(), ...TOWN.map((part) => part.voxels));

export type TownResult = { town: Voxel.World };

/** Three racing cars and a fire truck on a street lined with houses and towers. */
export const Town: SampleSpace.Partial<TownResult> = SampleSpace.partial('town', {
  schemas: [Voxel.World],
  run: () =>
    Effect.gen(function* () {
      const world = yield* Database.add(Voxel.make({ name: 'Town', gridX: 48, gridY: 32, voxels: town() }));
      return { town: world };
    }),
});

//
// Copyright 2026 DXOS.org
//

import * as Effect from 'effect/Effect';

import * as SampleSpace from '@dxos/app-toolkit/SampleSpace';
import { Database } from '@dxos/echo';
import * as Voxel from '@dxos/plugin-voxel/Voxel';

import { box, merge, mottle, translate } from './voxels.ts';

const CREEPER_SKIN = mottle(['green', 'lime', 'green', 'emerald']);
const GRASS = mottle(['green', 'lime']);
const DIRT = mottle(['amber', 'amber', 'yellow']);
const FACE = 'neutral';

/** The creeper's face, top row first, as seen from the front (`X` is a dark pixel). */
const FACE_PIXELS = ['........', '.XX..XX.', '.XX..XX.', '...XX...', '..XXXX..', '..XXXX..', '..X..X..', '........'];

/** Height of the grass block the creeper stands on. */
const GROUND = 3;

/**
 * A creeper standing on a grass block, at Minecraft's own pixel proportions: 4x4x6 legs, an 8x4x12 body and an 8x8x8
 * head facing +y, so one voxel is one skin pixel.
 */
export const creeper = (): Voxel.VoxelData[] => {
  const legs = [0, 4].flatMap((x) =>
    [0, 4].map((y) => box({ x, y, z: GROUND }, { x: 4, y: 4, z: 6 }, CREEPER_SKIN, { hollow: true })),
  );
  const body = box({ x: 0, y: 2, z: GROUND + 6 }, { x: 8, y: 4, z: 12 }, CREEPER_SKIN, { hollow: true });
  const headBase = GROUND + 18;
  const head = box({ x: 0, y: 0, z: headBase }, { x: 8, y: 8, z: 8 }, CREEPER_SKIN, { hollow: true });
  const face = FACE_PIXELS.flatMap((row, rowIndex) =>
    [...row].flatMap((pixel, x) => (pixel === 'X' ? [{ x, y: 7, z: headBase + 7 - rowIndex, hue: FACE }] : [])),
  );

  // Grass caps the top and hangs one voxel down the sides, as on a Minecraft grass block.
  const ground = box(
    { x: -4, y: -4, z: 0 },
    { x: 16, y: 16, z: GROUND },
    (x, y, z) => (z === GROUND - 1 ? GRASS(x, y, z) : DIRT(x, y, z)),
    { hollow: true },
  );

  // Centred on the origin, where the editor's grid is.
  return translate(merge(ground, ...legs, body, head, face), { x: -4, y: -4, z: 0 });
};

export type SculptureResult = { sculpture: Voxel.World };

/** A Minecraft creeper on a grass block, generated voxel by voxel. */
export const Sculpture: SampleSpace.Partial<SculptureResult> = SampleSpace.partial('sculpture', {
  schemas: [Voxel.World],
  run: () =>
    Effect.gen(function* () {
      // The editor's camera stands back in proportion to the grid, so a wide grid keeps the 29-voxel-tall creeper in frame.
      const sculpture = yield* Database.add(Voxel.make({ name: 'Creeper', gridX: 64, gridY: 64, voxels: creeper() }));
      return { sculpture };
    }),
});

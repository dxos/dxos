//
// Copyright 2026 DXOS.org
//

// @import-as-namespace

import * as Effect from 'effect/Effect';

import type * as AppCapabilities from '@dxos/app-toolkit/AppCapabilities';
import * as SampleSpace from '@dxos/app-toolkit/SampleSpace';
import { Ref } from '@dxos/echo';

import { Games } from './games.ts';
import { DataCenterMap } from './map.ts';
import { Sculpture } from './sculpture.ts';
import { Town } from './town.ts';
import { Vehicles } from './vehicles.ts';

/** Stable reference date so regenerations are reproducible. */
const REFERENCE = new Date('2026-10-19T12:00:00Z');

const partials = {
  games: Games,
  map: DataCenterMap,
  sculpture: Sculpture,
  town: Town,
  vehicles: Vehicles,
};

/**
 * A demo space of boards to look at: sixteen chess games at every stage, from famous finished games to openings a few
 * moves in and endgame studies, a world map pinning every Cloudflare data centre, a voxel Minecraft creeper, and a voxel
 * town where three racing cars and a fire truck drive past houses and towers, and the same line-up as a 3D canvas.
 */
export const make = (): SampleSpace.Definition<typeof partials, void> =>
  SampleSpace.make({
    space: { name: 'Demo', icon: 'crown', hue: 'indigo' },
    reference: REFERENCE,
    partials,
    build: (partials) =>
      Effect.gen(function* () {
        yield* partials.games();
        const { map } = yield* partials.map();
        // Games are not collection items, so they surface through the games section; the map is.
        yield* SampleSpace.collection('Maps', [Ref.make(map)]);
        // No navtree section lists voxel worlds, so without a collection they would be reachable only from the database.
        const { sculpture } = yield* partials.sculpture();
        const { town } = yield* partials.town();
        yield* SampleSpace.collection('Voxels', [Ref.make(sculpture), Ref.make(town)]);
        // The line-up is a 3D canvas drawing, kept in a collection of its own beside the maps and voxel worlds.
        const { drawing } = yield* partials.vehicles();
        yield* SampleSpace.collection('Scenes', [Ref.make(drawing)]);
      }),
  });

export const makeTemplate = (): AppCapabilities.SpaceTemplate =>
  SampleSpace.makeTemplate({
    id: 'org.dxos.plugin-debug.template.demo',
    description:
      'Sixteen chess games at every stage, from famous finished games to openings and endgame studies, a map of Cloudflare data centres, a voxel creeper, a voxel town and a 3D canvas of race cars and a fire truck.',
    definition: make(),
  });

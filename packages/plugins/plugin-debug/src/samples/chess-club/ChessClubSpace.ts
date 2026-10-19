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

/** Stable reference date so regenerations are reproducible. */
const REFERENCE = new Date('2026-10-19T12:00:00Z');

const partials = {
  games: Games,
  map: DataCenterMap,
};

/**
 * A demo space of boards to look at: sixteen chess games at every stage, from famous finished games to openings a few
 * moves in and endgame studies, and a world map pinning every Cloudflare data centre.
 */
export const make = (): SampleSpace.Definition<typeof partials, void> =>
  SampleSpace.make({
    space: { name: 'Chess Club', icon: 'crown', hue: 'indigo' },
    reference: REFERENCE,
    partials,
    build: (partials) =>
      Effect.gen(function* () {
        yield* partials.games();
        const { map } = yield* partials.map();
        // Games are not collection items, so they surface through the games section; the map is.
        yield* SampleSpace.collection('Maps', [Ref.make(map)]);
      }),
  });

export const makeTemplate = (): AppCapabilities.SpaceTemplate =>
  SampleSpace.makeTemplate({
    id: 'org.dxos.plugin-debug.template.chess-club',
    description:
      'Sixteen chess games at every stage, from famous finished games to openings and endgame studies, and a map of Cloudflare data centres.',
    definition: make(),
  });

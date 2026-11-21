//
// Copyright 2026 DXOS.org
//

// @import-as-namespace

import * as Effect from 'effect/Effect';

import type * as AppCapabilities from '@dxos/app-toolkit/AppCapabilities';
import * as SampleSpace from '@dxos/app-toolkit/SampleSpace';
import * as Architecture from '@dxos/plugin-canvas/Architecture';

import * as Studio from '../cloudflare/partial.ts';

const partials = { architecture: Architecture.Partial, studio: Studio.Partial };

export type Result = {
  readonly architecture: Architecture.Provides;
  readonly studio: Studio.Provides;
};

/**
 * DXOS twice over: Composer and EDGE as nested canvas drawings with the documents that introduce them, and the DXOS
 * deck, whose slides embed diagrams written in the diagram DSL.
 */
export const make = (): SampleSpace.Definition<typeof partials, Result> =>
  SampleSpace.make({
    space: { name: 'DXOS Architecture', icon: 'graph', hue: 'indigo' },
    partials,
    build: (partials) =>
      Effect.gen(function* () {
        const architecture = yield* partials.architecture();
        const studio = yield* partials.studio();
        return { architecture, studio };
      }),
  });

export const makeTemplate = (): AppCapabilities.SpaceTemplate =>
  SampleSpace.makeTemplate({
    id: 'org.dxos.plugin-debug.template.architecture',
    description:
      'The Composer and EDGE architecture as canvas drawings (open a box to drill into the diagram beneath it), ' +
      'and DXOS as one deck of diagrams written in the diagram DSL.',
    definition: make(),
  });

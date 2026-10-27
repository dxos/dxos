//
// Copyright 2026 DXOS.org
//

// @import-as-namespace

import * as Effect from 'effect/Effect';

import type * as AppCapabilities from '@dxos/app-toolkit/AppCapabilities';
import * as SampleSpace from '@dxos/app-toolkit/SampleSpace';

import { Partial } from './partial.ts';
import { Partial as WikiPartial } from './wiki/partial.ts';

const partials = { architecture: Partial, wiki: WikiPartial };

/**
 * The plugins whose objects the space holds: drawings, documents, decks and sheets, with the canvas plugin that
 * contributes the template already on.
 */
export const PLUGINS: ReadonlyArray<string> = [
  'org.dxos.plugin.illustrator',
  'org.dxos.plugin.markdown',
  'org.dxos.plugin.presenter',
  'org.dxos.plugin.sheet',
  'org.dxos.plugin.mermaid',
];

/**
 * The DXOS design wiki: Composer and EDGE as nested canvas drawings (each overview's boxes open the diagrams beneath
 * them), and a page per spec of the repository, grouped by the feature map's areas.
 */
export const make = (): SampleSpace.Definition<typeof partials, void> =>
  SampleSpace.make({
    space: { name: 'DXOS Architecture', icon: 'graph', hue: 'indigo' },
    partials,
    build: (partials) =>
      Effect.gen(function* () {
        const { drawings } = yield* partials.architecture();
        yield* partials.wiki({ drawings });
      }),
  });

export const makeTemplate = (): AppCapabilities.SpaceTemplate =>
  SampleSpace.makeTemplate({
    id: 'org.dxos.plugin.canvas.template.architecture',
    description:
      'The DXOS design wiki: a page per spec, grouped by the feature map, and the Composer and EDGE architecture as canvas drawings.',
    plugins: PLUGINS,
    definition: make(),
  });

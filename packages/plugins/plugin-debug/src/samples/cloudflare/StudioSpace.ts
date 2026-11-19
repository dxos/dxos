//
// Copyright 2026 DXOS.org
//

// @import-as-namespace

import * as Effect from 'effect/Effect';

import type * as AppCapabilities from '@dxos/app-toolkit/AppCapabilities';
import * as SampleSpace from '@dxos/app-toolkit/SampleSpace';

import { Partial, type Provides } from './partial.ts';

const partials = { studio: Partial };

/** DXOS in nine diagrams: each a canvas drawing built from its DSL text, presented as one deck. */
export const make = (): SampleSpace.Definition<typeof partials, { studio: Provides }> =>
  SampleSpace.make({
    space: { name: 'DXOS Deck', icon: 'presentation-chart', hue: 'blue' },
    partials,
    build: (partials) => Effect.map(partials.studio(), (studio) => ({ studio })),
  });

export const makeTemplate = (): AppCapabilities.SpaceTemplate =>
  SampleSpace.makeTemplate({
    id: 'org.dxos.plugin-debug.template.studio',
    description:
      'DXOS in nine diagrams (ECHO, plugins, Composer, the architecture, agents), each a canvas drawing written ' +
      'in the diagram DSL, presented as one deck.',
    definition: make(),
  });

//
// Copyright 2026 DXOS.org
//

// @import-as-namespace

import * as Effect from 'effect/Effect';

import type * as AppCapabilities from '@dxos/app-toolkit/AppCapabilities';
import * as SampleSpace from '@dxos/app-toolkit/SampleSpace';

import { Partial, type Provides } from './partial.ts';

const partials = { macro: Partial };

/** The financial, military and technology complexes: an events sheet, its timeline chart and a slide deck. */
export const make = (): SampleSpace.Definition<typeof partials, { macro: Provides }> =>
  SampleSpace.make({
    space: { name: 'Presenter', icon: 'piggy-bank', hue: 'green' },
    partials,
    build: (partials) => Effect.map(partials.macro(), (macro) => ({ macro })),
  });

export const makeTemplate = (): AppCapabilities.SpaceTemplate =>
  SampleSpace.makeTemplate({
    id: 'org.dxos.plugin-debug.template.presenter',
    description:
      'The financial, military and technology complexes: a sheet of events, its timeline chart and a slide deck.',
    definition: make(),
  });

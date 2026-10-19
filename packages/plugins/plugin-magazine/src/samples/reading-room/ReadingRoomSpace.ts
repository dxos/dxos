//
// Copyright 2026 DXOS.org
//

// @import-as-namespace

import * as Effect from 'effect/Effect';

import type * as AppCapabilities from '@dxos/app-toolkit/AppCapabilities';
import * as SampleSpace from '@dxos/app-toolkit/SampleSpace';

import { Partial } from './partial.ts';

const partials = { readingRoom: Partial };

/** Three illustrated feeds and a curated magazine drawn from them. */
export const make = (): SampleSpace.Definition<typeof partials, void> =>
  SampleSpace.make({
    space: { name: 'Reading Room', icon: 'lightbulb', hue: 'indigo' },
    partials,
    build: (partials) => Effect.asVoid(partials.readingRoom()),
  });

export const makeTemplate = (): AppCapabilities.SpaceTemplate =>
  SampleSpace.makeTemplate({
    id: 'org.dxos.plugin.magazine.template.reading-room',
    description: 'Three illustrated feeds on space, the outdoors and software, and a magazine curated from them.',
    definition: make(),
  });

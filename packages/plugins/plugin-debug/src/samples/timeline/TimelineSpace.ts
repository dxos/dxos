//
// Copyright 2026 DXOS.org
//

// @import-as-namespace

import * as Effect from 'effect/Effect';

import type * as AppCapabilities from '@dxos/app-toolkit/AppCapabilities';
import * as SampleSpace from '@dxos/app-toolkit/SampleSpace';

import { Partial, type Provides } from './partial.ts';

const partials = { timeline: Partial };

/** The timeline chart's project: its feature map, with each feature's status and spec, and the open tasks. */
export const make = (): SampleSpace.Definition<typeof partials, { timeline: Provides }> =>
  SampleSpace.make({
    space: { name: 'Timeline Project', icon: 'calendar-dots', hue: 'indigo' },
    partials,
    build: (partials) => Effect.map(partials.timeline(), (timeline) => ({ timeline })),
  });

export const makeTemplate = (): AppCapabilities.SpaceTemplate =>
  SampleSpace.makeTemplate({
    id: 'org.dxos.plugin-debug.template.timeline',
    description: 'The timeline chart as a project: its feature map with statuses and specs, and the open tasks.',
    definition: make(),
  });

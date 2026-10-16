//
// Copyright 2026 DXOS.org
//

// @import-as-namespace

import * as Effect from 'effect/Effect';

import type * as AppCapabilities from '@dxos/app-toolkit/AppCapabilities';
import * as SampleSpace from '@dxos/app-toolkit/SampleSpace';

import { Partial } from './partial.ts';

const phases = { architecture: Partial };

/** Composer and EDGE as nested canvas drawings: each overview's boxes open the diagrams beneath them. */
export const make = (): SampleSpace.Definition<typeof phases, void> =>
  SampleSpace.make({
    space: { name: 'DXOS Architecture', icon: 'graph', hue: 'indigo' },
    phases,
    build: (phases) => Effect.asVoid(phases.architecture()),
  });

export const makeTemplate = (): AppCapabilities.SpaceTemplate =>
  SampleSpace.makeTemplate({
    id: 'org.dxos.plugin.canvas.template.architecture',
    description:
      'The Composer and EDGE architecture as canvas drawings: open a box to drill into the diagram beneath it.',
    definition: make(),
  });

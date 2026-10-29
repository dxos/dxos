//
// Copyright 2026 DXOS.org
//

// @import-as-namespace

import * as Effect from 'effect/Effect';

import type * as AppCapabilities from '@dxos/app-toolkit/AppCapabilities';
import * as SampleSpace from '@dxos/app-toolkit/SampleSpace';

import { BRAMBLE_TEMPLATE_ID } from '../../constants.ts';
import { Partial } from './partial.ts';
import { REFERENCE } from './util.ts';

const partials = { bramble: Partial };

/**
 * The Bramble Coffee Roasters space template - the content every new identity gets on first launch,
 * and the template anyone can pick again from the create-space dialog.
 */
export const make = (): SampleSpace.Definition<typeof partials, void> =>
  SampleSpace.make({
    space: { name: 'Bramble Coffee Roasters', icon: 'potted-plant', hue: 'amber' },
    reference: REFERENCE,
    partials,
    build: (partials) => Effect.asVoid(partials.bramble()),
  });

export const makeTemplate = (): AppCapabilities.SpaceTemplate =>
  SampleSpace.makeTemplate({
    id: BRAMBLE_TEMPLATE_ID,
    description: 'A coffee roastery mid-launch: four projects, plus its people, mail, calendar, notes and roast logs.',
    definition: make(),
  });

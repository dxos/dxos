//
// Copyright 2026 DXOS.org
//

// @import-as-namespace

import * as Effect from 'effect/Effect';

import type * as AppCapabilities from '@dxos/app-toolkit/AppCapabilities';
import * as SampleSpace from '@dxos/app-toolkit/SampleSpace';

import { Partial } from './partial.ts';

const partials = { sales: Partial };

/** A small sales sheet and its charts, for trying the sheet and its charts companion. */
export const make = (): SampleSpace.Definition<typeof partials, void> =>
  SampleSpace.make({
    space: { name: 'Sales', icon: 'shopping-cart', hue: 'indigo' },
    partials,
    build: (partials) => Effect.asVoid(partials.sales()),
  });

export const makeTemplate = (): AppCapabilities.SpaceTemplate =>
  SampleSpace.makeTemplate({
    id: 'org.dxos.plugin.sheet.template.sales',
    description: 'A small sales sheet with a bar chart and a pie chart.',
    definition: make(),
  });

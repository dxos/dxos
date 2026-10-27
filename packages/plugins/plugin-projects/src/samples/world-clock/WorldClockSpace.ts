//
// Copyright 2026 DXOS.org
//

// @import-as-namespace

import * as Effect from 'effect/Effect';

import type * as AppCapabilities from '@dxos/app-toolkit/AppCapabilities';
import * as SampleSpace from '@dxos/app-toolkit/SampleSpace';

import { type Variant } from '../../templates/composer-plugin.ts';
import { makePartial } from './partial.ts';

export const TEMPLATE_ID = 'org.dxos.plugin.projects.template.worldClock';

/**
 * The World Clock round trip as a space: the Composer Plugin project that builds the plugin, the spec it is built
 * from, and the feature map filed against that spec. The run builds the plugin and publishes it (to the private
 * registry in a browser, or offers it by URL on the desktop); once installed, its registry page opens the same spec.
 */
export const make = (variant: Variant) => {
  const partials = { worldClock: makePartial(variant) };
  return SampleSpace.make({
    space: { name: 'World Clock', icon: 'planet', hue: 'sky' },
    partials,
    build: (partials) => Effect.asVoid(partials.worldClock()),
  });
};

export const makeTemplate = (variant: Variant): AppCapabilities.SpaceTemplate =>
  SampleSpace.makeTemplate({
    id: TEMPLATE_ID,
    description:
      'An agent builds the World Clock plugin from its spec and publishes it; install it from the registry and open the spec it was built from.',
    definition: make(variant),
  });

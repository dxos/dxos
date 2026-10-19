//
// Copyright 2026 DXOS.org
//

// @import-as-namespace

import * as Effect from 'effect/Effect';

import type * as AppCapabilities from '@dxos/app-toolkit/AppCapabilities';
import * as SampleSpace from '@dxos/app-toolkit/SampleSpace';

import { Partial } from './partial.ts';

export const TEMPLATE_ID = 'org.dxos.plugin.magazine.template.ai-briefing';

const partials = { aiBriefing: Partial };

export const make = (): SampleSpace.Definition<typeof partials, void> =>
  SampleSpace.make({
    space: { name: 'AI Briefing', icon: 'atom', hue: 'sky' },
    partials,
    build: (partials) => Effect.asVoid(partials.aiBriefing()),
  });

export const makeTemplate = (): AppCapabilities.SpaceTemplate =>
  SampleSpace.makeTemplate({
    id: TEMPLATE_ID,
    description:
      'AI news from The Verge, MIT Technology Review, Latent Space, Wired and Simon Willison, curated into a magazine.',
    definition: make(),
  });

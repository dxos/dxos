//
// Copyright 2026 DXOS.org
//

// @import-as-namespace

import type * as AppCapabilities from '@dxos/app-toolkit/AppCapabilities';
import * as SampleSpace from '@dxos/app-toolkit/SampleSpace';
import * as Operation from '@dxos/compute/Operation';
import { Obj, Ref } from '@dxos/echo';

import { FeedOperation } from '#types';

import { Partial, type Provides } from './partial.ts';

const partials = { aiBriefing: Partial };

export const make = (): SampleSpace.Definition<typeof partials, Provides> =>
  SampleSpace.make({
    space: { name: 'AI Briefing', icon: 'atom', hue: 'sky' },
    partials,
    build: (partials) => partials.aiBriefing(),
    followups: ({ magazine }) =>
      Operation.schedule(
        FeedOperation.CurateMagazine,
        { magazine: Ref.make(magazine) },
        { spaceId: Obj.getDatabase(magazine)?.spaceId },
      ),
  });

export const makeTemplate = (): AppCapabilities.SpaceTemplate =>
  SampleSpace.makeTemplate({
    id: 'org.dxos.plugin.magazine.template.ai-briefing',
    description:
      'AI news from The Verge, MIT Technology Review, Latent Space, Wired and Simon Willison, curated into a magazine.',
    definition: make(),
  });

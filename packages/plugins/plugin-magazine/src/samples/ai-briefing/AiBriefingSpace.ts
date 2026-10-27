//
// Copyright 2026 DXOS.org
//

// @import-as-namespace

import * as Effect from 'effect/Effect';

import type * as AppCapabilities from '@dxos/app-toolkit/AppCapabilities';
import * as SampleSpace from '@dxos/app-toolkit/SampleSpace';
import * as Operation from '@dxos/compute/Operation';
import { Database, Obj, Ref } from '@dxos/echo';

import { FeedOperation } from '#types';

import { Partial, type Provides } from './partial.ts';

const partials = { aiBriefing: Partial };

export const make = (): SampleSpace.Definition<typeof partials, Provides, SampleSpace.Services | Operation.Service> =>
  SampleSpace.make({
    space: { name: 'AI Briefing', icon: 'atom', hue: 'sky' },
    partials,
    build: (partials) =>
      Effect.gen(function* () {
        const provides = yield* partials.aiBriefing();
        yield* Database.flush();
        yield* Operation.schedule(
          FeedOperation.CurateMagazine,
          { magazine: Ref.make(provides.magazine) },
          { spaceId: Obj.getDatabase(provides.magazine)?.spaceId },
        );
        return provides;
      }),
  });

export const makeTemplate = (): AppCapabilities.SpaceTemplate =>
  SampleSpace.makeTemplate({
    id: 'org.dxos.plugin.magazine.template.ai-briefing',
    description:
      'AI news from The Verge, MIT Technology Review, Latent Space, Wired and Simon Willison, curated into a magazine.',
    definition: make(),
  });

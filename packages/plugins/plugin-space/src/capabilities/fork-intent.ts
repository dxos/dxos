//
// Copyright 2026 DXOS.org
//

import * as Effect from 'effect/Effect';

import * as Capability from '@dxos/app-framework/Capability';

import { stashForkIntent } from '../publication/pending-fork.ts';
import type * as SpaceSchema from '../types/SpaceSchema.ts';

/** Takes `?fork=` off the URL at startup, before onboarding can navigate away from it. */
export default Capability.makeModule((options: SpaceSchema.SpacePluginOptions = {}) =>
  Effect.sync(() => {
    if (options.publication) {
      stashForkIntent();
    }
    return [];
  }),
);

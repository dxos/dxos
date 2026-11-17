//
// Copyright 2026 DXOS.org
//

import * as Effect from 'effect/Effect';

import * as Capability from '@dxos/app-framework/Capability';

import { stashForkIntent } from '../publication/pending-fork.ts';
import type * as SpaceSchema from '../types/SpaceSchema.ts';

export default Capability.makeModule((options: SpaceSchema.SpacePluginOptions = {}) =>
  Effect.sync(() => {
    if (options.publication) {
      stashForkIntent();
    }
    return [];
  }),
);

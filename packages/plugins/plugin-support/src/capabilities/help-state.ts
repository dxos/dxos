//
// Copyright 2025 DXOS.org
//

import * as Effect from 'effect/Effect';

import * as Capability from '@dxos/app-framework/Capability';
import { createKvsStore } from '@dxos/effect';

import { meta } from '#meta';
import { HelpCapabilities } from '#types';

export const HelpState = Capability.makeModule('HelpState', { provides: [HelpCapabilities.State] }, () =>
  Effect.sync(() => {
    const stateAtom = createKvsStore({
      key: `${meta.profile.key}.state`,
      schema: HelpCapabilities.StateSchema,
      defaultValue: () => ({
        running: false,
        showHints: true,
        showWelcome: true,
        seenTours: [],
      }),
    });

    return Capability.contribute(HelpCapabilities.State, stateAtom);
  }),
);

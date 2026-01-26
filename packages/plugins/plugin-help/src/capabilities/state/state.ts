//
// Copyright 2025 DXOS.org
//

import * as Effect from 'effect/Effect';

import { Capability } from '@dxos/app-framework';
import { createKvsStore } from '@dxos/effect';

import { meta } from '../../meta';
import { HelpCapabilities } from '../../types';

export default Capability.makeModule(() =>
  Effect.sync(() => {
    const stateAtom = createKvsStore({
      key: meta.id,
      schema: HelpCapabilities.StateSchema,
      defaultValue: () => ({
        running: false,
        showHints: true,
        showWelcome: true,
      }),
    });

    return Capability.contributes(HelpCapabilities.State, stateAtom);
  }),
);

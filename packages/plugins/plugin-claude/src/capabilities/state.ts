//
// Copyright 2026 DXOS.org
//

import * as Effect from 'effect/Effect';

import * as Capability from '@dxos/app-framework/Capability';
import * as KvsStore from '@dxos/effect/KvsStore';

import { ClaudeCapabilities, State } from '#types';

import { AGENT_KEY_PREFIX } from '../constants.ts';

export default Capability.makeModule(() =>
  Effect.sync(() => {
    const stateAtom = KvsStore.make({
      key: `${AGENT_KEY_PREFIX}.state`,
      schema: State.State,
      defaultValue: () => ({}),
    });

    return Capability.contribute(ClaudeCapabilities.State, stateAtom);
  }),
);

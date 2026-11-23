//
// Copyright 2026 DXOS.org
//

import * as Effect from 'effect/Effect';

import * as Capability from '@dxos/app-framework/Capability';
import * as KvsStore from '@dxos/effect/KvsStore';

import { CodeCapabilities, State } from '#types';

import { CodeNamespace } from '../namespace.ts';

export default Capability.makeModule(() =>
  Effect.sync(() => {
    const stateAtom = KvsStore.make({
      key: `${CodeNamespace.key}.state`,
      schema: State.State,
      defaultValue: () => ({}),
    });

    return Capability.contribute(CodeCapabilities.State, stateAtom);
  }),
);

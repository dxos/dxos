//
// Copyright 2025 DXOS.org
//

import { Atom } from '@effect-atom/atom-react';
import * as Effect from 'effect/Effect';

import { Capabilities, Capability } from '@dxos/app-framework';

import { type CallsCapabilities as CC, CallsCapabilities } from '#types';

export default Capability.makeModule(
  Effect.fnUntraced(function* () {
    const registry = yield* Capability.get(Capabilities.AtomRegistry);
    const stateAtom = Atom.make<CC.CallRecordState>({}).pipe(Atom.keepAlive);

    const updateState = (updater: (current: CC.CallRecordState) => CC.CallRecordState) => {
      registry.set(stateAtom, updater(registry.get(stateAtom)));
    };

    return Capability.contributes(CallsCapabilities.RecordState, {
      stateAtom,
      get state() {
        return registry.get(stateAtom);
      },
      updateState,
    });
  }),
);

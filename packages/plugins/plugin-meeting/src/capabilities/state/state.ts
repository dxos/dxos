//
// Copyright 2025 DXOS.org
//

import { Atom } from '@effect-atom/atom-react';
import * as Effect from 'effect/Effect';

import { Capabilities, Capability } from '@dxos/app-framework';

import { type MeetingCapabilities as MC, MeetingCapabilities } from '../../types';

export default Capability.makeModule(
  Effect.fnUntraced(function* () {
    const registry = yield* Capability.get(Capabilities.AtomRegistry);
    const stateAtom = Atom.make<MC.MeetingState>({}).pipe(Atom.keepAlive);

    const updateState = (updater: (current: MC.MeetingState) => MC.MeetingState) => {
      registry.set(stateAtom, updater(registry.get(stateAtom)));
    };

    return Capability.contributes(MeetingCapabilities.State, {
      stateAtom,
      get state() {
        return registry.get(stateAtom);
      },
      updateState,
    });
  }),
);

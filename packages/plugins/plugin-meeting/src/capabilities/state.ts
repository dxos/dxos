//
// Copyright 2025 DXOS.org
//

import { Atom } from '@effect-atom/atom';
import * as Effect from 'effect/Effect';

import * as Capabilities from '@dxos/app-framework/Capabilities';
import * as Capability from '@dxos/app-framework/Capability';

import { type MeetingCapabilities as MC, MeetingCapabilities } from '#types';

export default Capability.makeModule(
  Effect.fnUntraced(function* () {
    const registry = yield* Capabilities.AtomRegistry;
    const stateAtom = Atom.make<MC.MeetingState>({}).pipe(Atom.keepAlive);

    const updateState = (updater: (current: MC.MeetingState) => MC.MeetingState) => {
      registry.set(stateAtom, updater(registry.get(stateAtom)));
    };

    return Capability.contribute(MeetingCapabilities.State, {
      stateAtom,
      get state() {
        return registry.get(stateAtom);
      },
      updateState,
    });
  }),
);

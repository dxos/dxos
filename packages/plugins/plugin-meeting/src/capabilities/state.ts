//
// Copyright 2025 DXOS.org
//

import { Atom } from '@effect-atom/atom';
import * as Effect from 'effect/Effect';

import * as Capabilities from '@dxos/app-framework/Capabilities';
import * as Capability from '@dxos/app-framework/Capability';

import { MeetingCapabilities } from '#types';

export default Capability.makeModule(
  Effect.fnUntraced(function* () {
    const registry = yield* Capabilities.AtomRegistry;
    const stateAtom = Atom.make<MeetingCapabilities.MeetingState>({}).pipe(Atom.keepAlive);

    const updateState = (updater: (current: MeetingCapabilities.MeetingState) => MeetingCapabilities.MeetingState) => {
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

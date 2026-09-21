//
// Copyright 2025 DXOS.org
//

import * as Effect from 'effect/Effect';
import * as Atom from 'effect/unstable/reactivity/Atom';

import * as Capabilities from '@dxos/app-framework/Capabilities';
import * as Capability from '@dxos/app-framework/Capability';

import { MeetingCapabilities } from '#types';
import { MeetingEvents } from '#types';

export const MeetingState = Capability.makeModule(
  'MeetingState',
  {
    requires: [Capabilities.AtomRegistry],
    provides: [MeetingCapabilities.State],
    activatesOn: MeetingEvents.Start,
  },
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

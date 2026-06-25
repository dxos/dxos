//
// Copyright 2026 DXOS.org
//

import { Atom } from '@effect-atom/atom-react';
import * as Effect from 'effect/Effect';

import { Capability } from '@dxos/app-framework';

import { RoutineCapabilities } from '#types';

export default Capability.makeModule(() =>
  Effect.sync(() => {
    // Session-scoped (not persisted): an edit session should not survive a reload.
    const stateAtom = Atom.make<RoutineCapabilities.RoutineState>({ editing: {} }).pipe(Atom.keepAlive);
    return Capability.contributes(RoutineCapabilities.State, stateAtom);
  }),
);

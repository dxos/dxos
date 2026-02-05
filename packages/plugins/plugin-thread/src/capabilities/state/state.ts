//
// Copyright 2025 DXOS.org
//

import { Atom } from '@effect-atom/atom-react';
import * as Effect from 'effect/Effect';

import { Capability } from '@dxos/app-framework';

import { ThreadCapabilities, type ThreadState, type ViewStore } from '../../types';

export default Capability.makeModule(
  Effect.fnUntraced(function* () {
    const stateAtom = Atom.make<ThreadState>({ toolbar: {}, drafts: {} }).pipe(Atom.keepAlive);
    const viewStoreAtom = Atom.make<ViewStore>({}).pipe(Atom.keepAlive);

    return [
      Capability.contributes(ThreadCapabilities.State, stateAtom),
      Capability.contributes(ThreadCapabilities.ViewState, viewStoreAtom),
    ];
  }),
);

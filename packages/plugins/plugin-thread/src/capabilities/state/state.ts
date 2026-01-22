//
// Copyright 2025 DXOS.org
//

import { Atom } from '@effect-atom/atom-react';
import * as Effect from 'effect/Effect';

import { Capability, Common } from '@dxos/app-framework';

import { ThreadCapabilities, type ThreadState, type ViewState, type ViewStore } from '../../types';

const initialViewState: ViewState = { showResolvedThreads: false };

export default Capability.makeModule(
  Effect.fnUntraced(function* () {
    const registry = yield* Capability.get(Common.Capability.AtomRegistry);
    const stateAtom = Atom.make<ThreadState>({ toolbar: {}, drafts: {} });
    const viewStoreAtom = Atom.make<ViewStore>({});

    const getViewState = (subjectId: string): ViewState => {
      const viewStore = registry.get(viewStoreAtom);
      if (!viewStore[subjectId]) {
        registry.set(viewStoreAtom, {
          ...viewStore,
          [subjectId]: { ...initialViewState },
        });
      }
      return registry.get(viewStoreAtom)[subjectId];
    };

    const updateState = (updater: (current: ThreadState) => ThreadState) => {
      registry.set(stateAtom, updater(registry.get(stateAtom)));
    };

    const subscribeState = (callback: () => void) => {
      return registry.subscribe(stateAtom, callback);
    };

    return Capability.contributes(ThreadCapabilities.State, {
      stateAtom,
      get state() {
        return registry.get(stateAtom);
      },
      updateState,
      subscribeState,
      getViewState,
    });
  }),
);

//
// Copyright 2025 DXOS.org
//

import * as Effect from 'effect/Effect';

import { Capability } from '@dxos/app-framework';
import { live } from '@dxos/live-object';

import { ThreadCapabilities, type ThreadState, type ViewStore } from '../../types';

const initialViewState = { showResolvedThreads: false };

export default Capability.makeModule(() =>
  Effect.sync(() => {
    const state = live<ThreadState>({ toolbar: {}, drafts: {} });
    const viewStore = live<ViewStore>({});

    const getViewState = (subjectId: string) => {
      if (!viewStore[subjectId]) {
        viewStore[subjectId] = { ...initialViewState };
      }
      return viewStore[subjectId];
    };

    return Capability.contributes(ThreadCapabilities.State, { state, getViewState });
  }),
);

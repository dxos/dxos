//
// Copyright 2025 DXOS.org
//

import { contributes, defineCapabilityModule } from '@dxos/app-framework';
import { live } from '@dxos/live-object';

import { type ThreadState, type ViewStore } from '../types';

import { ThreadCapabilities } from './capabilities';

const initialViewState = { showResolvedThreads: false };

export default defineCapabilityModule(() => {
  const state = live<ThreadState>({ toolbar: {}, drafts: {} });
  const viewStore = live<ViewStore>({});

  const getViewState = (subjectId: string) => {
    if (!viewStore[subjectId]) {
      viewStore[subjectId] = { ...initialViewState };
    }
    return viewStore[subjectId];
  };

  return contributes(ThreadCapabilities.State, { state, getViewState });
});

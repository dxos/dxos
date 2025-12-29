//
// Copyright 2025 DXOS.org
//

import { Capability } from '@dxos/app-framework';
import { live } from '@dxos/live-object';

import { ThreadCapabilities, type ThreadState, type ViewStore } from '../../types';

const initialViewState = { showResolvedThreads: false };

export default Capability.makeModule(() => {
  const state = live<ThreadState>({ toolbar: {}, drafts: {} });
  const viewStore = live<ViewStore>({});

  const getViewState = (subjectId: string) => {
    if (!viewStore[subjectId]) {
      viewStore[subjectId] = { ...initialViewState };
    }
    return viewStore[subjectId];
  };

  return Capability.contributes(ThreadCapabilities.State, { state, getViewState });
});

//
// Copyright 2025 DXOS.org
//

import { contributes } from '@dxos/app-framework';
import { create } from '@dxos/live-object';

import { ThreadCapabilities } from './capabilities';
import { type ThreadState, type ViewStore } from '../types';

const initialViewState = { showResolvedThreads: false };

export default () => {
  const state = create<ThreadState>({ activities: {}, drafts: {} });
  const viewStore = create<ViewStore>({});

  const getViewState = (subjectId: string) => {
    if (!viewStore[subjectId]) {
      viewStore[subjectId] = { ...initialViewState };
    }
    return viewStore[subjectId];
  };

  return contributes(ThreadCapabilities.State, { state, getViewState });
};

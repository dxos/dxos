//
// Copyright 2025 DXOS.org
//

import { contributes } from '@dxos/app-framework';
import { live } from '@dxos/live-object';

import { ThreadCapabilities } from './capabilities';
import { type ThreadState, type ViewStore } from '../types';

const initialViewState = { showResolvedThreads: false };

// TODO(burdon): Comment?
export default () => {
  const state = live<ThreadState>({ toolbar: {}, drafts: {} });
  const viewStore = live<ViewStore>({});

  const getViewState = (subjectId: string) => {
    if (!viewStore[subjectId]) {
      viewStore[subjectId] = { ...initialViewState };
    }
    return viewStore[subjectId];
  };

  return contributes(ThreadCapabilities.State, { state, getViewState });
};

//
// Copyright 2025 DXOS.org
//

import React from 'react';

import { StatsPanel } from '@dxos/devtools';
import { useSyncState, getSyncSummary, SyncStatusDetail } from '@dxos/plugin-space';

export const DevtoolsOverviewContainer = () => {
  const state = useSyncState();
  const summary = getSyncSummary(state);

  return (
    <>
      <StatsPanel />
      <SyncStatusDetail state={state} summary={summary} />
    </>
  );
};

export default DevtoolsOverviewContainer;

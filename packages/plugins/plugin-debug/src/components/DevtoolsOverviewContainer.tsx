//
// Copyright 2025 DXOS.org
//

import React from 'react';

import { StatsPanel, useStats } from '@dxos/devtools';
import { type GlobalState, MeetingStatusDetail } from '@dxos/plugin-meeting';
import { useSyncState, getSyncSummary, SyncStatusDetail } from '@dxos/plugin-space';

export const DevtoolsOverviewContainer = ({ callState }: { callState?: GlobalState }) => {
  const state = useSyncState();
  const summary = getSyncSummary(state);
  const [stats, refreshStats] = useStats();

  return (
    <>
      <StatsPanel stats={stats} onRefresh={refreshStats}>
        <MeetingStatusDetail state={callState} />
      </StatsPanel>
      <SyncStatusDetail state={state} summary={summary} />
    </>
  );
};

export default DevtoolsOverviewContainer;

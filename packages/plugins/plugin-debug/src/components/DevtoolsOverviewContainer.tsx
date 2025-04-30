//
// Copyright 2025 DXOS.org
//

import React from 'react';

import { StatsPanel, useStats } from '@dxos/devtools';
import { type GlobalState, MeetingStatusDetail } from '@dxos/plugin-meeting';

export const DevtoolsOverviewContainer = ({ callState }: { callState?: GlobalState }) => {
  const [stats, refreshStats] = useStats();

  return (
    <StatsPanel stats={stats} onRefresh={refreshStats}>
      <MeetingStatusDetail state={callState} />
    </StatsPanel>
  );
};

export default DevtoolsOverviewContainer;

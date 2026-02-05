//
// Copyright 2025 DXOS.org
//

import React from 'react';

import { Surface } from '@dxos/app-framework/react';
import { StatsPanel, useStats } from '@dxos/devtools';

export const DevtoolsOverviewContainer = () => {
  const [stats, refreshStats] = useStats();

  return (
    <StatsPanel stats={stats} onRefresh={refreshStats}>
      <Surface role='devtools-overview' />
    </StatsPanel>
  );
};

export default DevtoolsOverviewContainer;

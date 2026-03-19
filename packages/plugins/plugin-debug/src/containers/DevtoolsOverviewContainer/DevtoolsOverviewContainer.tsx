//
// Copyright 2025 DXOS.org
//

import React from 'react';

import { Surface } from '@dxos/app-framework/ui';
import { StatsPanel, useStats } from '@dxos/devtools';

export const DevtoolsOverviewContainer = () => {
  const [stats, refreshStats] = useStats();

  return (
    <StatsPanel stats={stats} onRefresh={refreshStats}>
      <Surface.Surface role='devtools-overview' />
    </StatsPanel>
  );
};

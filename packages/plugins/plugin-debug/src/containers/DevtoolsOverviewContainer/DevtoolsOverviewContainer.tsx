//
// Copyright 2025 DXOS.org
//

import React from 'react';

import { Surface } from '@dxos/app-framework/ui';
import { StatsPanel, useStats } from '@dxos/devtools';

export const DevtoolsOverviewContainer = () => {
  const [stats, refreshStats] = useStats();
  const surfaceProfilerStats = Surface.useProfilerStats();
  const clearSurfaceProfiler = Surface.useProfilerClear();

  return (
    <StatsPanel
      stats={stats}
      surfaceProfilerStats={surfaceProfilerStats}
      onRefresh={refreshStats}
      onClearSurfaceProfiler={clearSurfaceProfiler}
    >
      <Surface.Surface role='devtools-overview' />
    </StatsPanel>
  );
};

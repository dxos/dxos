//
// Copyright 2025 DXOS.org
//

import React from 'react';

import { Surface } from '@dxos/app-framework/ui';
import { StatsPanel, useStats } from '@dxos/devtools';

import { DevtoolsOverview } from '../../roles';

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
      <Surface.Surface type={DevtoolsOverview} />
    </StatsPanel>
  );
};

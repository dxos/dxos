//
// Copyright 2025 DXOS.org
//

import React, { useCallback, useMemo } from 'react';

import { Surface } from '@dxos/app-framework/ui';
import { StatsPanel, useStats } from '@dxos/devtools';

import { DevtoolsOverview } from '#types';

export const DevtoolsOverviewContainer = () => {
  const [stats, refreshStats] = useStats();
  const surfaceProfilerStats = Surface.useProfilerStats();
  const surfaceMetrics = Surface.useMetrics();
  const clearSurfaceProfiler = Surface.useProfilerClear();

  // The panel joins profiler stats with dispatch metrics, so reset must clear both.
  const handleClearSurfaceProfiler = useCallback(() => {
    clearSurfaceProfiler?.();
    Surface.clearMetrics();
  }, [clearSurfaceProfiler]);

  // Join dispatch metrics onto the render-timing stats (both keyed by `surface/<id>/<role>`).
  const enrichedStats = useMemo(() => {
    const byId = new Map(surfaceMetrics.map((metric) => [metric.id, metric]));
    return surfaceProfilerStats.map((stat) => {
      const metric = byId.get(stat.id);
      return metric
        ? {
            ...stat,
            candidates: metric.candidates,
            truncated: metric.truncated,
            errors: metric.errors,
            dataUnstable: metric.dataUnstable,
          }
        : stat;
    });
  }, [surfaceProfilerStats, surfaceMetrics]);

  return (
    <StatsPanel
      stats={stats}
      surfaceProfilerStats={enrichedStats}
      onRefresh={refreshStats}
      onClearSurfaceProfiler={handleClearSurfaceProfiler}
    >
      <Surface.Surface type={DevtoolsOverview} />
    </StatsPanel>
  );
};

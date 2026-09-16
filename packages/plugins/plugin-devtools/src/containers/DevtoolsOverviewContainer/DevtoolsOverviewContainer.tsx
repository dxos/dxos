//
// Copyright 2025 DXOS.org
//

import React, { useCallback, useMemo } from 'react';

import { Surface } from '@dxos/app-framework/ui';
import { AppSurface } from '@dxos/app-toolkit/ui';
import { StatsPanel, type SurfaceProfilerStats, useStats } from '@dxos/devtools';

import { type DevtoolsCardData } from '../../capabilities/DevtoolsCards.tsx';

/** The stats stack: one poll of the client's stats, fanned out to every card contributed to the role. */
export const DevtoolsOverviewContainer = () => {
  const [stats, refreshStats] = useStats();
  const surfaceProfilerStats = Surface.useProfilerStats();
  const surfaceMetrics = Surface.useMetrics();
  const clearSurfaceProfiler = Surface.useProfilerClear();

  // The profiler card joins profiler stats with dispatch metrics, so reset must clear both.
  const handleClearSurfaceProfiler = useCallback(() => {
    clearSurfaceProfiler?.();
    Surface.clearMetrics();
  }, [clearSurfaceProfiler]);

  // Join dispatch metrics onto the render-timing stats (both keyed by `surface/<id>/<role>`).
  const enrichedStats = useMemo<SurfaceProfilerStats[]>(() => {
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

  const data = useMemo<DevtoolsCardData>(
    () => ({ stats, surfaceProfilerStats: enrichedStats, onClearSurfaceProfiler: handleClearSurfaceProfiler }),
    [stats, enrichedStats, handleClearSurfaceProfiler],
  );

  return (
    <StatsPanel onRefresh={refreshStats}>
      <Surface.Surface type={AppSurface.DevtoolsOverview} data={data} />
    </StatsPanel>
  );
};

DevtoolsOverviewContainer.displayName = 'DevtoolsOverviewContainer';

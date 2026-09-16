//
// Copyright 2025 DXOS.org
//

import React, { useCallback, useEffect, useMemo, useState } from 'react';

import { Surface } from '@dxos/app-framework/ui';
import { AppSurface } from '@dxos/app-toolkit/ui';
import { StatsPanel, type SurfaceProfilerStats, useStats } from '@dxos/devtools';

import { type DevtoolsCardData } from '../../capabilities/DevtoolsCards.tsx';

/**
 * The stats stack: one poll of the client's stats, fanned out to every card contributed to the role.
 * The profiler and dispatch metrics are sampled on each refresh rather than subscribed to: this
 * container is itself a profiled surface, so a live subscription would record an entry for every
 * re-render the notification caused and loop at frame rate, flushing every other surface out of the
 * profiler's window — which is what made the Surfaces card's count wander with no interaction.
 */
export const DevtoolsOverviewContainer = () => {
  const [stats, refreshStats] = useStats();
  const getProfilerEntries = Surface.useProfilerSnapshot();
  const clearSurfaceProfiler = Surface.useProfilerClear();
  const [surfaceProfilerStats, setSurfaceProfilerStats] = useState<SurfaceProfilerStats[]>([]);

  // Join dispatch metrics onto the render-timing stats (both keyed by `surface/<id>/<role>`), leaving
  // out the stack's own surfaces — the companion and every card on its role — so the panel does not
  // measure itself.
  const sampleProfiler = useCallback(() => {
    const byId = new Map(Surface.getMetrics().map((metric) => [metric.id, metric]));
    setSurfaceProfilerStats(
      Surface.aggregateProfilerStats(getProfilerEntries())
        .filter((stat) => !stat.id.endsWith('.devtoolsOverview'))
        .map((stat) => {
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
        }),
    );
  }, [getProfilerEntries]);
  useEffect(sampleProfiler, [sampleProfiler]);

  const handleRefresh = useCallback(() => {
    refreshStats();
    sampleProfiler();
  }, [refreshStats, sampleProfiler]);

  // The profiler card joins profiler stats with dispatch metrics, so reset must clear both.
  const handleClearSurfaceProfiler = useCallback(() => {
    clearSurfaceProfiler?.();
    Surface.clearMetrics();
    sampleProfiler();
  }, [clearSurfaceProfiler, sampleProfiler]);

  const data = useMemo<DevtoolsCardData>(
    () => ({ stats, surfaceProfilerStats, onClearSurfaceProfiler: handleClearSurfaceProfiler }),
    [stats, surfaceProfilerStats, handleClearSurfaceProfiler],
  );

  return (
    <StatsPanel onRefresh={handleRefresh}>
      <Surface.Surface type={AppSurface.DevtoolsOverview} data={data} />
    </StatsPanel>
  );
};

DevtoolsOverviewContainer.displayName = 'DevtoolsOverviewContainer';

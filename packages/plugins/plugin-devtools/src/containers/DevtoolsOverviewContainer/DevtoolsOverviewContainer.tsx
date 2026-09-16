//
// Copyright 2025 DXOS.org
//

import React, { useCallback, useEffect, useMemo, useState } from 'react';

import { Surface } from '@dxos/app-framework/ui';
import { AppSurface } from '@dxos/app-toolkit/ui';
import { StatsPanel, type SurfaceProfilerStats, useStats } from '@dxos/devtools';

import { type DevtoolsCardData, isDebugSurface } from '../../capabilities/DevtoolsCards.tsx';

/**
 * The stats stack: one poll of the client's stats, fanned out to every card contributed to the role.
 * The profiler and dispatch metrics are sampled on each refresh rather than subscribed to: this
 * container is itself a profiled surface, so a live subscription would record an entry for every
 * re-render the notification caused and loop at frame rate, flushing every other surface out of the
 * profiler's window — which is what made the Surfaces card's count wander with no interaction.
 */
export const DevtoolsOverviewContainer = () => {
  const [stats, refreshStats] = useStats();
  const getProfilerStats = Surface.useProfilerSnapshot();
  const clearSurfaceProfiler = Surface.useProfilerClear();
  // Resampled as surfaces mount and unmount: with a restored layout this container mounts at boot,
  // before most of the app, so a single sample on mount would list only what existed then.
  const mounted = Surface.useMounted();
  const [surfaceProfilerStats, setSurfaceProfilerStats] = useState<SurfaceProfilerStats[]>([]);

  // One row per surface mounted right now (the profiler records renders, not mounts), with its
  // cumulative render timings and dispatch metrics joined on `surface/<id>/<role>` where they exist.
  // The debug tooling's own surfaces are left out so the panel does not measure itself.
  const sampleProfiler = useCallback(() => {
    const timings = new Map(getProfilerStats().map((stat) => [stat.id, stat]));
    const metrics = new Map(Surface.getMetrics().map((metric) => [metric.id, metric]));
    setSurfaceProfilerStats(
      mounted
        .filter((surface) => !isDebugSurface(surface))
        .map(({ id, role }) => {
          // Mirrors the profiler's own id, which prints an anonymous surface as `undefined`.
          const profilerId = `surface/${id}/${role}`;
          const timing = timings.get(profilerId) ?? {
            id: profilerId,
            mountCount: 0,
            updateCount: 0,
            totalRenders: 0,
            avgActualDuration: 0,
            maxActualDuration: 0,
            avgBaseDuration: 0,
            lastActualDuration: 0,
            lastCommitTime: 0,
          };
          const metric = metrics.get(profilerId);
          return metric
            ? {
                ...timing,
                candidates: metric.candidates,
                truncated: metric.truncated,
                errors: metric.errors,
                dataUnstable: metric.dataUnstable,
              }
            : timing;
        })
        .sort((a, b) => b.maxActualDuration - a.maxActualDuration || a.id.localeCompare(b.id)),
    );
  }, [getProfilerStats, mounted]);
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

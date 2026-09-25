//
// Copyright 2026 DXOS.org
//

// Card surfaces whose data comes from a hook rather than the stack's `DevtoolsCardData`.

import React, { useCallback, useMemo, useState } from 'react';

import { Surface } from '@dxos/app-framework/ui';
import { AppSurface } from '@dxos/app-toolkit/ui';
import {
  EdgeCard,
  type Stats,
  SurfaceProfilerCard,
  type SurfaceProfilerStats,
  SwarmTraceCard,
  SyncCard,
  useEdgeStatus,
  useSwarmTrace,
  useSyncRows,
} from '@dxos/devtools';
import { SpaceState, useSpaces } from '@dxos/react-client/echo';

/** Surfaces hosting the debug tooling; they and everything rendered inside them are not listed. */
const DEBUG_HOSTS = new Set(['devtoolsOverview', 'debugDrawer']);

/** Whether a mounted surface is part of the debug tooling rather than the app being inspected. */
export const isDebugSurface = ({ id, role, ancestors }: Surface.Mounted): boolean =>
  role.endsWith('.devtoolsOverview') ||
  (id !== undefined && DEBUG_HOSTS.has(id)) ||
  ancestors.some((ancestor) => DEBUG_HOSTS.has(ancestor));

/** Data the stats stack passes to every `AppSurface.DevtoolsOverview` card. */
export type DevtoolsCardData = {
  stats: Stats;
  surfaceProfilerStats: SurfaceProfilerStats[];
  onClearSurfaceProfiler?: () => void;
};

export const isDevtoolsCardData = (data: unknown): data is DevtoolsCardData =>
  typeof data === 'object' && data !== null && 'stats' in data && 'surfaceProfilerStats' in data;

/**
 * The card role narrowed to the stack's data. `Surface.makeFilter` types its data by the token, so
 * the binding is built directly, as `AppSurface.subject` does.
 */
export const devtoolsCard: Surface.Filter<DevtoolsCardData> = {
  bindings: [{ role: AppSurface.DevtoolsOverview.role, guard: isDevtoolsCardData }],
};

export type EdgeCardSurfaceProps = Pick<DevtoolsCardData, 'stats'>;

export const EdgeCardSurface = ({ stats }: EdgeCardSurfaceProps) => {
  const { status, refresh, copy } = useEdgeStatus();
  const spaces = useSpaces({ all: true });
  const spaceNames = useMemo(() => {
    const names: Record<string, string> = {};
    for (const space of spaces) {
      const name = space.state.get() === SpaceState.SPACE_READY ? space.properties.name : undefined;
      if (typeof name === 'string') {
        names[space.id] = name;
      }
    }
    return names;
  }, [spaces]);
  return <EdgeCard edge={stats.edge} status={status} spaceNames={spaceNames} onRefresh={refresh} onCopy={copy} />;
};

export type SurfaceProfilerCardSurfaceProps = Pick<DevtoolsCardData, 'surfaceProfilerStats' | 'onClearSurfaceProfiler'>;

/** The profiler card with the surface highlight overlay's flag, which lives on `window`, mirrored in state. */
export const SurfaceProfilerCardSurface = ({
  surfaceProfilerStats,
  onClearSurfaceProfiler,
}: SurfaceProfilerCardSurfaceProps) => {
  const [debug, setDebug] = useState(() => Surface.isDebugEnabled());
  const handleDebugChange = useCallback((enabled: boolean) => {
    Surface.setDebug(enabled);
    setDebug(enabled);
  }, []);

  // The selected role's surfaces with their data and dispatch metrics, following mounts and unmounts.
  const selected = Surface.useSelected();
  const mounted = Surface.useMounted();
  const detail = useMemo(() => {
    if (!selected) {
      return undefined;
    }
    const metrics = new Map(Surface.getMetrics().map((metric) => [metric.id, metric]));
    return mounted
      .filter((surface) => surface.role === selected && !isDebugSurface(surface))
      .map(({ id, role, data }) => ({ id, data, metric: metrics.get(`surface/${id}/${role}`) }));
  }, [selected, mounted]);

  return (
    <SurfaceProfilerCard
      stats={surfaceProfilerStats}
      debug={debug}
      onDebugChange={handleDebugChange}
      onClear={onClearSurfaceProfiler}
      selected={selected}
      onSelect={Surface.select}
      detail={detail}
    />
  );
};

export const SwarmTraceCardSurface = () => {
  const { messages, spaceCount, available, clear } = useSwarmTrace();
  return <SwarmTraceCard messages={messages} spaceCount={spaceCount} available={available} onClear={clear} />;
};

export const SyncCardSurface = () => {
  const { spaces, copy } = useSyncRows();
  return <SyncCard spaces={spaces} onCopy={copy} />;
};

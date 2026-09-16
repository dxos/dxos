//
// Copyright 2026 DXOS.org
//

// Card surfaces whose data comes from a hook rather than the stack's `DevtoolsCardData`.

import React, { useCallback, useState } from 'react';

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
  return <EdgeCard edge={stats.edge} status={status} onRefresh={refresh} onCopy={copy} />;
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

  return (
    <SurfaceProfilerCard
      stats={surfaceProfilerStats}
      debug={debug}
      onDebugChange={handleDebugChange}
      onClear={onClearSurfaceProfiler}
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

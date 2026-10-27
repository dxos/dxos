//
// Copyright 2026 DXOS.org
//

// Card surfaces whose data comes from a hook rather than the stack's `DevtoolsCardData`.

import { useAtomValue } from '@effect/atom-react/Hooks';
import * as Atom from 'effect/reactivity/Atom';
import React, { useCallback, useMemo, useState } from 'react';

import * as Hooks from '@dxos/app-framework/Hooks';
import * as Surface from '@dxos/app-framework/Surface';
import * as CreateAtom from '@dxos/app-graph/CreateAtom';
import * as AppSurface from '@dxos/app-toolkit/AppSurface';
import {
  EdgeCard,
  type EdgeCardSpace,
  IndexerCard,
  QueriesCard,
  type Stats,
  SurfaceProfilerCard,
  type SurfaceProfilerStats,
  SwarmTraceCard,
  SyncCard,
  useEdgeStatus,
  useIndexerRows,
  useQueryMetrics,
  useSwarmTrace,
  useSyncRows,
} from '@dxos/devtools';
import { Obj } from '@dxos/echo';
import * as DebugOperation from '@dxos/plugin-debug/DebugOperation';
import { useClient, useMulticastObservable } from '@dxos/react-client';
import { SpaceState } from '@dxos/react-client/echo';

import { Devtools } from '#types';

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
  const client = useClient();
  // The observable's own array, which changes only when the space list does (`useSpaces` copies it every render).
  const spaces = useMulticastObservable(client.spaces);
  const localSpacesAtom = useMemo(
    () =>
      Atom.make((get) => {
        const local: Record<string, EdgeCardSpace> = {};
        for (const space of spaces ?? []) {
          const state = get(CreateAtom.fromObservable(space.state));
          if (state === SpaceState.SPACE_DELETED) {
            continue;
          }
          const name = state === SpaceState.SPACE_READY ? get(Obj.atom(space.properties)).name : undefined;
          local[space.id] = { name: typeof name === 'string' ? name : undefined, tag: space.tags[0] };
        }
        return local;
      }),
    [spaces],
  );
  const localSpaces = useAtomValue(localSpacesAtom);
  return <EdgeCard edge={stats.edge} status={status} spaces={localSpaces} onRefresh={refresh} onCopy={copy} />;
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

export const IndexerCardSurface = () => {
  const { spaces, refresh, copy } = useIndexerRows();
  return <IndexerCard spaces={spaces} onRefresh={refresh} onCopy={copy} />;
};

/** The slowest queries; the header button shows every query on the devtools Queries page. */
export const QueriesCardSurface = () => {
  const { queries } = useQueryMetrics();
  const { invokePromise } = Hooks.useOperationInvoker();
  const handleOpen = useCallback(
    () => void invokePromise(DebugOperation.OpenPage, { nodeId: Devtools.getNodePath(Devtools.Echo.Queries) }),
    [invokePromise],
  );
  return <QueriesCard queries={queries} onOpen={handleOpen} />;
};

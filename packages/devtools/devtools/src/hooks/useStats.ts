//
// Copyright 2024 DXOS.org
//

import { useEffect, useState } from 'react';

import { SpaceState } from '@dxos/client/echo';
import { type NetworkStatus } from '@dxos/client/mesh';
import { type EchoDataStats, type EchoStatsDiagnostic } from '@dxos/echo-host';
import { log } from '@dxos/log';
import { type QueryEdgeStatusResponse } from '@dxos/protocols/proto/dxos/client/services';
import { useClient } from '@dxos/react-client';
import { useAsyncEffect } from '@dxos/react-hooks';
import {
  DiagnosticsChannel,
  type DiagnosticsRequest,
  type HeapInfo,
  WORKER_INSTANCE_TAG,
  readHeap,
} from '@dxos/tracing';

// TODO(burdon): Factor out.

/**
 * Per-realm heap usage. The tab reads its own; the worker answers over the diagnostics channel,
 * because `performance.memory` reports only the realm that reads it.
 *
 * https://developer.mozilla.org/en-US/docs/Web/API/Performance/memory
 * https://github.com/WICG/performance-measure-memory
 * https://developer.mozilla.org/en-US/docs/Web/Security/Secure_Contexts
 * https://caniuse.com/mdn-api_performance_measureuseragentspecificmemory
 * https://web.dev/articles/coop-coep
 */
export type MemoryInfo = {
  tab?: HeapInfo;
  worker?: HeapInfo;
};

/**
 * Represents the @info props in QueryState.
 */
export type QueryInfo = {
  // TODO(dmaretskyi): Remove.
  filter: any;
  metrics: any;
  active: boolean;
};

/**
 *
 */
export type DatabaseInfo = {
  spaces: number;
  /** Objects across every open space, from `db.stats()`. Summed: the panel reports the profile. */
  objects?: { alive: number; deleted: number };
  /** Automerge documents owned by the spaces on disk, from `db.stats()`. */
  storedDocuments?: number;
  /** Feeds registered across every open space, and their blocks. */
  feeds?: { count: number; blocks: number };
  /** Automerge documents currently held in memory — unrelated to what is stored. */
  documents: number;
  documentsToReconcile: number;
  dataStats?: EchoDataStats;
};

/**
 *
 */
export type Stats = {
  performanceEntries?: PerformanceEntry[];
  database?: DatabaseInfo;
  queries?: QueryInfo[];
  memory?: MemoryInfo;
  network?: NetworkStatus;
  edge?: QueryEdgeStatusResponse;
};

/**
 * https://developer.mozilla.org/en-US/docs/Web/API/Performance_API/Performance_data#performance_entries
 * @param entryTypes
 */
export const usePerformanceObserver = (entryTypes: string[]) => {
  const [entries, setEntries] = useState<PerformanceEntryList>();
  useEffect(() => {
    const po = new PerformanceObserver((list) => {
      setEntries(list.getEntries());
    });

    po.observe({ entryTypes });
    return () => po.disconnect();
  }, []);

  return entries;
};

export const useStats = (): [Stats, () => void] => {
  const client = useClient();
  const [stats, setStats] = useState<Stats>({});
  const [update, forceUpdate] = useState({});
  const performanceEntries = usePerformanceObserver([
    // https://developer.mozilla.org/en-US/docs/Web/API/Performance_API/Performance_data#performance_entries
    'first-input',
    'longtask',
    'largest-contentful-paint',
    'paint',
  ]);

  // Quick metrics.
  useAsyncEffect(async () => {
    const begin = performance.now();

    const database: DatabaseInfo = {
      spaces: client.spaces.get().length,
      documents: 0,
      documentsToReconcile: 0,
    };

    log('collected stats', { elapsed: performance.now() - begin });
    setStats((stats) =>
      Object.assign({}, stats, {
        performanceEntries,
        memory: Object.assign({}, stats.memory, { tab: readHeap() }),
        database,
      }),
    );
  }, [update]);

  // Slower metrics.
  useAsyncEffect(async () => {
    const begin = performance.now();

    const spaces = client.spaces.get().filter((space) => space.state.get() === SpaceState.SPACE_READY);

    const syncStates = await Promise.all(spaces.map((space) => space.internal.db.getAutomergeSyncState()));
    const documentsToReconcile = syncStates
      .flatMap((s) => s.peers?.map((p) => p.differentDocuments + p.missingOnLocal + p.missingOnRemote) ?? [])
      .reduce((acc, x) => acc + x, 0);

    // Per-space storage census. Each is a round trip to the host, so it rides the slower interval
    // alongside sync state rather than the frame-rate metrics above.
    const spaceStats = await Promise.all(spaces.map((space) => space.db.stats()));
    const objects = spaceStats.reduce(
      (acc, { objects }) => ({ alive: acc.alive + objects.alive, deleted: acc.deleted + objects.deleted }),
      { alive: 0, deleted: 0 },
    );
    const storedDocuments = spaceStats.reduce((acc, { documents }) => acc + documents, 0);
    const feeds = spaceStats.reduce(
      (acc, { feeds, feedBlocks }) => ({ count: acc.count + feeds, blocks: acc.blocks + feedBlocks }),
      { count: 0, blocks: 0 },
    );

    log('collected stats', { elapsed: performance.now() - begin });
    setStats((stats) =>
      Object.assign({}, stats, {
        database: Object.assign({}, stats.database, {
          documentsToReconcile,
          objects,
          storedDocuments,
          feeds,
        }),
      }),
    );
  }, [update]);

  useEffect(() => {
    const stream = client.services.services.NetworkService!.queryStatus();
    stream.subscribe((network) => {
      setStats((stats) =>
        Object.assign({}, stats, {
          network,
        }),
      );
    });

    return () => {
      void stream.close();
    };
  }, []);

  useEffect(() => {
    const stream = client.services.services.EdgeAgentService!.queryEdgeStatus();
    stream.subscribe((edge) => {
      setStats((stats) =>
        Object.assign({}, stats, {
          edge,
        }),
      );
    });

    return () => {
      void stream.close();
    };
  }, []);

  const echoStatsDiagnostic = useDiagnostic<EchoStatsDiagnostic>(
    { id: 'echo-stats', instanceTag: WORKER_INSTANCE_TAG },
    1_000,
  );

  const workerHeap = useDiagnostic<HeapInfo | undefined>({ id: 'heap', instanceTag: WORKER_INSTANCE_TAG }, 1_000);

  if (workerHeap && stats.memory?.worker !== workerHeap) {
    stats.memory = Object.assign({}, stats.memory, { worker: workerHeap });
  }

  if (stats.database && echoStatsDiagnostic) {
    stats.database.documents = echoStatsDiagnostic.loadedDocsCount;
    stats.database.dataStats = echoStatsDiagnostic.dataStats;
  }

  return [stats, () => forceUpdate({})];
};

// TODO(burdon): Move to util.
export const removeEmpty = (obj: any): any => {
  const maybeTruncateKey = (str: string) => (str.length > 32 ? str.slice(0, 8) : str);
  return Object.fromEntries(
    Object.entries(obj)
      .filter(([_, v]) => v !== undefined && v !== null && v !== false && !(Array.isArray(v) && v.length === 0))
      .map(([k, v]) => [k, v === Object(v) ? removeEmpty(v) : typeof v === 'string' ? maybeTruncateKey(v) : v]),
  );
};

const useDiagnostic = <T>(request: DiagnosticsRequest, refreshInterval: number): T | undefined => {
  const [data, setData] = useState<T>();

  useEffect(() => {
    const channel = new DiagnosticsChannel();

    const fetch = async () => {
      try {
        const { data } = await channel.fetch(request);
        setData(data);
      } catch (error) {}
    };

    void fetch();
    const interval = setInterval(fetch, refreshInterval);

    return () => {
      clearInterval(interval);
    };
  }, []);

  return data;
};

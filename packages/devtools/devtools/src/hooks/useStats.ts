//
// Copyright 2024 DXOS.org
//

import get from 'lodash.get';
import { useEffect, useState } from 'react';

import { SpaceState } from '@dxos/client/echo';
import { type NetworkStatus } from '@dxos/client/mesh';
import { type EchoStatsDiagnostic, type FilterParams, type QueryMetrics } from '@dxos/echo-db';
import { log } from '@dxos/log';
import { type Resource } from '@dxos/protocols/proto/dxos/tracing';
import { useAsyncEffect } from '@dxos/react-async';
import { useClient } from '@dxos/react-client';
import { type Diagnostics, TRACE_PROCESSOR, type DiagnosticsRequest } from '@dxos/tracing';
import { DiagnosticsChannel } from '@dxos/tracing';

// TODO(burdon): Factor out.

/**
 * https://developer.mozilla.org/en-US/docs/Web/API/Performance/memory
 * https://github.com/WICG/performance-measure-memory
 * https://developer.mozilla.org/en-US/docs/Web/Security/Secure_Contexts
 * https://caniuse.com/mdn-api_performance_measureuseragentspecificmemory
 * https://web.dev/articles/coop-coep
 */
export type MemoryInfo = {
  jsHeapSizeLimit: number;
  totalJSHeapSize: number;
  usedJSHeapSize: number;
  used: number;
};

/**
 * Represents the @info props in QueryState.
 */
export type QueryInfo = {
  filter: FilterParams;
  metrics: QueryMetrics;
  active: boolean;
};

/**
 *
 */
export type DatabaseInfo = {
  spaces: number;
  objects: number;
  documents: number;
  documentsToReconcile: number;
};

/**
 *
 */
export type Stats = {
  performanceEntries?: PerformanceEntry[];
  diagnostics?: Diagnostics;
  database?: DatabaseInfo;
  queries?: QueryInfo[];
  memory?: MemoryInfo;
  network?: NetworkStatus;
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
  useAsyncEffect(
    async (isMounted) => {
      const begin = performance.now();

      // TODO(burdon): Reconcile with diagnostics.
      const objects = Object.values(
        TRACE_PROCESSOR.findResourcesByClassName('AutomergeContext')[0]?.instance.deref().repo.handles,
      )
        .map((handle: any) => handle.docSync())
        .filter(Boolean);

      const database: DatabaseInfo = {
        spaces: client.spaces.get().length,
        objects: objects.length,
        documents: 0,
        documentsToReconcile: 0,
      };

      const memory: MemoryInfo = (window.performance as any).memory;
      if ('measureUserAgentSpecificMemory' in window.performance) {
        // TODO(burdon): Breakdown.
        // https://developer.mozilla.org/en-US/docs/Web/API/Performance/measureUserAgentSpecificMemory
        // const { bytes } = (await (window.performance as any).measureUserAgentSpecificMemory()) as { bytes: number };
      }
      memory.used = memory.usedJSHeapSize / memory.jsHeapSizeLimit;

      log('collected stats', { elapsed: performance.now() - begin });
      if (isMounted()) {
        setStats((stats) =>
          Object.assign({}, stats, {
            performanceEntries,
            diagnostics: TRACE_PROCESSOR.getDiagnostics(),
            memory,
            database,
          }),
        );
      }
    },
    [update],
  );

  // Slower metrics.
  useAsyncEffect(
    async (isMounted) => {
      const begin = performance.now();

      // client.experimental.graph;
      // TODO(burdon): This is very expensive (do separately).
      const diagnostics = await client.diagnostics();

      // const s = TRACE_PROCESSOR.findResourcesByClassName('QueryState');
      const resources = get(diagnostics, 'services.diagnostics.trace.resources') as Record<string, Resource>;
      const queries: QueryInfo[] = Object.values(resources)
        .filter((res) => res.className === 'QueryState')
        .map((res) => {
          return res.info as QueryInfo;
        });

      const syncStates = await Promise.all(
        client.spaces
          .get()
          .filter((space) => space.state.get() === SpaceState.SPACE_READY)
          .map((space) => space.db.coreDatabase.getSyncState()),
      );
      const documentsToReconcile = syncStates
        .flatMap((s) => s.peers?.map((p) => p.documentsToReconcile) ?? [])
        .reduce((acc, x) => acc + x, 0);

      log('collected stats', { elapsed: performance.now() - begin });
      if (isMounted()) {
        setStats((stats) =>
          Object.assign({}, stats, {
            queries,
            database: Object.assign({}, stats.database, { documentsToReconcile }),
          }),
        );
      }
    },
    [update],
  );

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

  const { loadedDocsCount = 0 } =
    useDiagnostic<EchoStatsDiagnostic>({ id: 'echo-stats', instanceTag: 'shared-worker' }, 1_000) ?? {};

  if (stats.database) {
    stats.database.documents = loadedDocsCount;
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
      const { data } = await channel.fetch(request);
      setData(data);
    };

    void fetch();
    const interval = setInterval(fetch, refreshInterval);

    return () => {
      clearInterval(interval);
    };
  }, []);

  return data;
};

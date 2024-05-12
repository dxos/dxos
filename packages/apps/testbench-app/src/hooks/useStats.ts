//
// Copyright 2024 DXOS.org
//

import get from 'lodash.get';
import { useEffect, useState } from 'react';

import { type FilterParams, type QueryMetrics } from '@dxos/echo-db';
import { type Resource } from '@dxos/protocols/proto/dxos/tracing';
import { useClient } from '@dxos/react-client';
import { type Diagnostics, TRACE_PROCESSOR } from '@dxos/tracing';

// TODO(burdon): Factor out.

// TODO(burdon): Observations:
// - At 1000 objects:
//  index.mjs?t=1715529589310:240 LocalClientNetworkAdapter#0 Timeout [3,000ms]
// - _initializeDB called twice?

// https://developer.mozilla.org/en-US/docs/Web/API/Performance/memory
// https://github.com/WICG/performance-measure-memory
// https://developer.mozilla.org/en-US/docs/Web/Security/Secure_Contexts
// https://caniuse.com/mdn-api_performance_measureuseragentspecificmemory
// https://web.dev/articles/coop-coep
type Memory = {
  jsHeapSizeLimit: number;
  totalJSHeapSize: number;
  usedJSHeapSize: number;
  used: number;
};

export type QueryInfo = {
  filter: FilterParams;
  metrics: QueryMetrics;
};

export type Stats = {
  diagnostics?: Diagnostics;
  objects?: number;
  queries?: QueryInfo[];
  memory?: Memory;
};

export const useStats = (): [Stats, () => void] => {
  const client = useClient();
  const [stats, setStats] = useState<Stats>({});
  const [update, forceUpdate] = useState({});
  useEffect(() => {
    setTimeout(async () => {
      // client.experimental.graph;
      // TODO(burdon): Polling?
      const diagnostics = await client.diagnostics();
      // const q = client.services.services.QueryService;
      // const s = TRACE_PROCESSOR.findResourcesByClassName('QueryState');
      const resources = get(diagnostics, 'services.diagnostics.trace.resources') as Record<string, Resource>;
      const queries: QueryInfo[] = Object.values(resources)
        .filter((res) => res.className === 'QueryState')
        .map(
          (res) =>
            ({
              filter: res.info._filter, // TODO(burdon): Is this serialized? Why underscore.
              metrics: res.info.metrics,
            }) satisfies QueryInfo,
        );

      // TODO(burdon): Reconcile with diagnostics.
      const objects = Object.values(
        TRACE_PROCESSOR.findResourcesByClassName('AutomergeContext')[0]?.instance.deref().repo.handles,
      )
        .map((handle: any) => handle.docSync())
        .filter(Boolean);

      const memory: Memory = (window.performance as any).memory;
      if ('measureUserAgentSpecificMemory' in window.performance) {
        // TODO(burdon): Breakdown.
        // https://developer.mozilla.org/en-US/docs/Web/API/Performance/measureUserAgentSpecificMemory
        // const { bytes } = (await (window.performance as any).measureUserAgentSpecificMemory()) as { bytes: number };
      }
      memory.used = memory.usedJSHeapSize / memory.jsHeapSizeLimit;

      setStats({
        diagnostics: TRACE_PROCESSOR.getDiagnostics(),
        memory,
        objects: objects.length,
        queries,
      });
    });
  }, [update]);

  return [stats, () => forceUpdate({})];
};

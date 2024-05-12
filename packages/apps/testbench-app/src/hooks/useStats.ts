//
// Copyright 2024 DXOS.org
//

import { useEffect, useState } from 'react';

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

export type Query = {
  objects: number;
  duration: number;
};

export type Stats = {
  diagnostics?: Diagnostics;
  objects?: number;
  queries?: Query[];
  memory?: Memory;
};

export const useStats = (): Stats => {
  // const client = useClient();
  const [stats, setStats] = useState<Stats>({});
  useEffect(() => {
    setTimeout(async () => {
      // client.experimental.graph;

      const s = TRACE_PROCESSOR.findResourcesByClassName('QueryState');
      console.log(s);

      // TODO(burdon): Factor out.
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
        objects: objects.length,
        memory,
        // TODO(burdon): Get from QueryState/QueryService.
        queries: [
          {
            duration: 100,
            objects: 10,
          },
          {
            duration: 120,
            objects: 20,
          },
          {
            duration: 65,
            objects: 12,
          },
        ],
      });
    });
  }, []);

  return stats;
};

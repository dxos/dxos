//
// Copyright 2023 DXOS.org
//

import { trace } from './api';
import { type HeapInfo, readHeap } from './heap';

export * from './api';
export * from './heap';
export * from './trace-processor';
export * from './tracing-types';
export * from './diagnostic';
export * from './diagnostics-channel';
export * from './remote/metrics';

trace.diagnostic({
  id: 'process-info',
  name: 'Process Info',
  fetch: async () => {
    return {
      platform: globalThis.process?.platform,
      arch: globalThis.process?.arch,
      versions: globalThis.process?.versions,
      href: globalThis.location?.href,
    };
  },
});

// Registered here so every realm (tab, worker) answers the same request over the diagnostics
// channel; `performance.memory` reports only the realm that reads it.
trace.diagnostic<HeapInfo | undefined>({
  id: 'heap',
  name: 'Heap',
  fetch: async () => readHeap(),
});

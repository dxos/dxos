//
// Copyright 2023 DXOS.org
//

import { trace } from './api.ts';

export * from './api.ts';
export * from './trace-processor.ts';
export * from './tracing-types.ts';
export * from './diagnostic.ts';
export * from './diagnostics-channel.ts';
export * from './remote/metrics.ts';

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

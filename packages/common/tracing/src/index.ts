//
// Copyright 2023 DXOS.org
//

import { trace } from './api';

export * from './api';
export * from './symbols';
export * from './trace-processor';
export * from './trace-sender';
export * from './metrics';
export * from './diagnostic';

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

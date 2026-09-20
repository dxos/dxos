//
// Copyright 2026 DXOS.org
//

import { defineConfig } from '../../../../vite.base.config.ts';

export default defineConfig({
  entry: {
    index: 'src/index.ts',
    testing: 'src/testing/index.ts',
    // Its own output because a worker is started from a real file: the bundle that contains this
    // module cannot also be the module the worker loads.
    WorkerSandboxEntry: 'src/agent-service/code-mode/WorkerSandboxEntry.ts',
  },
  test: { node: true },
});

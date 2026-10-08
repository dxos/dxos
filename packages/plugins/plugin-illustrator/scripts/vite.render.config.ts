//
// Copyright 2026 DXOS.org
//

import { defineConfig } from 'vite';

// The render scripts run from source so a render never waits on upstream builds, and the ECHO types
// they import carry legacy decorators that only an explicit compiler option turns on.
export default defineConfig({
  resolve: { conditions: ['source', 'module', 'node', 'import', 'default'] },
  ssr: { resolve: { conditions: ['source', 'node', 'import', 'default'], externalConditions: ['source'] } },
  esbuild: { tsconfigRaw: { compilerOptions: { experimentalDecorators: true } } },
});

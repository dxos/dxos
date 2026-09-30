//
// Copyright 2026 DXOS.org
//

import { defineConfig } from '../../../vite.base.config.ts';

export default defineConfig({
  entry: {
    index: 'src/index.ts',
    SandboxPlugin: 'src/SandboxPlugin.ts',
    skills: 'src/skills/index.ts',
    meta: 'src/meta.ts',
    plugin: 'src/plugin.ts',
    Sandbox: 'src/types/Sandbox.ts',
    SandboxEvents: 'src/types/SandboxEvents.ts',
    SandboxOperation: 'src/types/SandboxOperation.ts',
    SandboxService: 'src/types/SandboxService.ts',
    SandboxCapabilities: 'src/types/SandboxCapabilities.ts',
    Settings: 'src/types/Settings.ts',
    HttpBackend: 'src/services/HttpBackend.ts',
    types: 'src/types/index.ts',
  },
  test: { node: true },
});

//
// Copyright 2026 DXOS.org
//

import { defineConfig } from '../../../vite.base.config.ts';

export default defineConfig({
  entry: {
    index: 'src/index.ts',
    SandboxPlugin: 'src/SandboxPlugin.ts',
    skills: 'src/skills/index.ts',
    capabilities: 'src/capabilities/index.ts',
    components: 'src/components/index.ts',
    containers: 'src/containers/index.ts',
    meta: 'src/meta.ts',
    plugin: 'src/plugin.ts',
    Repository: 'src/types/Repository.ts',
    RepositoryOperation: 'src/types/RepositoryOperation.ts',
    RepositoryService: 'src/types/RepositoryService.ts',
    Sandbox: 'src/types/Sandbox.ts',
    SandboxEvents: 'src/types/SandboxEvents.ts',
    SandboxOperation: 'src/types/SandboxOperation.ts',
    SandboxService: 'src/types/SandboxService.ts',
    SandboxCapabilities: 'src/types/SandboxCapabilities.ts',
    Settings: 'src/types/Settings.ts',
    HttpBackend: 'src/services/HttpBackend.ts',
    translations: 'src/translations.ts',
    types: 'src/types/index.ts',
  },
  jsx: 'react',
  test: { node: true, storybook: true },
});

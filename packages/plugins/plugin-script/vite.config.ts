//
// Copyright 2026 DXOS.org
//

import { defineConfig } from '../../../vite.base.config.ts';

export default defineConfig({
  entry: {
    ScriptSkill: 'src/skills/ScriptSkill.ts',
    ScriptOperationHandlerSet: 'src/operations/ScriptOperationHandlerSet.ts',
    index: 'src/index.ts',
    ScriptPlugin: 'src/ScriptPlugin.ts',
    plugin: 'src/plugin.tsx',
    skills: 'src/skills/index.ts',
    capabilities: 'src/capabilities/index.ts',
    components: 'src/components/index.ts',
    containers: 'src/containers/index.ts',
    hooks: 'src/hooks/index.ts',
    meta: 'src/meta.ts',
    operations: 'src/operations/index.ts',
    templates: 'src/templates/index.ts',
    translations: 'src/translations.ts',
    Settings: 'src/types/Settings.ts',
    testing: 'src/testing/index.ts',
    Notebook: 'src/types/Notebook.ts',
    ScriptCapabilities: 'src/types/ScriptCapabilities.ts',
    ScriptEvents: 'src/types/ScriptEvents.ts',
    ScriptOperation: 'src/types/ScriptOperation.ts',
    types: 'src/types/index.ts',
  },
  jsx: 'react',
  assetsAsFiles: true,
  test: { node: true, storybook: true },
});

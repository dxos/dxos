//
// Copyright 2026 DXOS.org
//

import { defineConfig } from '../../../vite.base.config.ts';

export default defineConfig({
  entry: {
    index: 'src/index.ts',
    ArchifyPlugin: 'src/ArchifyPlugin.ts',
    plugin: 'src/plugin.tsx',
    capabilities: 'src/capabilities/index.ts',
    components: 'src/components/index.ts',
    containers: 'src/containers/index.ts',
    meta: 'src/meta.ts',
    model: 'src/model/index.ts',
    operations: 'src/operations/index.ts',
    skills: 'src/skills/index.ts',
    translations: 'src/translations.ts',
    ArchifyEvents: 'src/types/ArchifyEvents.ts',
    Diagram: 'src/types/Diagram.ts',
    DiagramOperation: 'src/types/DiagramOperation.ts',
    types: 'src/types/index.ts',
  },
  jsx: 'react',
  test: { node: true },
});

//
// Copyright 2026 DXOS.org
//

import { defineConfig } from '../../../vite.base.config.ts';

export default defineConfig({
  entry: {
    KanbanSkill: 'src/skills/KanbanSkill.ts',
    KanbanOperationHandlerSet: 'src/operations/KanbanOperationHandlerSet.ts',
    index: 'src/index.ts',
    KanbanPlugin: 'src/KanbanPlugin.ts',
    plugin: 'src/plugin.tsx',
    skills: 'src/skills/index.ts',
    capabilities: 'src/capabilities/index.ts',
    components: 'src/components/index.ts',
    containers: 'src/containers/index.ts',
    hooks: 'src/hooks/index.ts',
    meta: 'src/meta.ts',
    operations: 'src/operations/index.ts',
    testing: 'src/testing/index.ts',
    translations: 'src/translations.ts',
    KanbanSchema: 'src/types/KanbanSchema.ts',
    KanbanLayout: 'src/types/KanbanLayout.ts',
    KanbanConstants: 'src/types/KanbanConstants.ts',
    Kanban: 'src/types/Kanban.ts',
    KanbanEvents: 'src/types/KanbanEvents.ts',
    KanbanOperation: 'src/types/KanbanOperation.ts',
    types: 'src/types/index.ts',
  },
  jsx: 'react',
  test: { node: true, browser: 'chromium', storybook: true },
});

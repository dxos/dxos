//
// Copyright 2026 DXOS.org
//

import { defineConfig } from '../../../vite.base.config.ts';

export default defineConfig({
  registry: true,
  entry: {
    KanbanSkill: 'src/skills/KanbanSkill.ts',
    KanbanOperationHandlerSet: 'src/operations/KanbanOperationHandlerSet.ts',
    index: 'src/index.ts',
    skills: 'src/skills/index.ts',
    components: 'src/components/index.ts',
    containers: 'src/containers/index.ts',
    hooks: 'src/hooks/index.ts',
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
  test: { node: true, browser: 'chromium', storybook: true, workerd: true },
});

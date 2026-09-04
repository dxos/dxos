//
// Copyright 2026 DXOS.org
//

import { defineConfig } from '../../../vite.base.config.ts';

export default defineConfig({
  entry: {
    index: 'src/index.ts',
    MarkdownPlugin: 'src/MarkdownPlugin.ts',
    plugin: 'src/plugin.tsx',
    skills: 'src/skills/index.ts',
    capabilities: 'src/capabilities/index.ts',
    components: 'src/components/index.ts',
    containers: 'src/containers/index.ts',
    hooks: 'src/hooks/index.ts',
    meta: 'src/meta.ts',
    operations: 'src/operations/index.ts',
    testing: 'src/testing.ts',
    translations: 'src/translations.ts',
    Markdown: 'src/types/Markdown.ts',
    MarkdownOperationHandlerSet: 'src/operations/MarkdownOperationHandlerSet.ts',
    MarkdownSkill: 'src/skills/MarkdownSkill.ts',
    MarkdownCapabilities: 'src/types/MarkdownCapabilities.ts',
    MarkdownEvents: 'src/types/MarkdownEvents.ts',
    MarkdownOperation: 'src/types/MarkdownOperation.ts',
    Settings: 'src/types/Settings.ts',
    types: 'src/types/index.ts',
  },
  jsx: 'react',
  test: { node: true, storybook: true },
});

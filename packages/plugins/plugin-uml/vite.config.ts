//
// Copyright 2026 DXOS.org
//

import { defineConfig } from '../../../vite.base.config.ts';

export default defineConfig({
  entry: {
    index: 'src/index.ts',
    ClassNode: 'src/types/ClassNode.ts',
    UmlSkill: 'src/skills/UmlSkill.ts',
    components: 'src/components/index.ts',
    skills: 'src/skills/index.ts',
    translations: 'src/translations.ts',
    types: 'src/types/index.ts',
  },
  jsx: 'react',
  test: { node: true, storybook: { timeout: 60_000 } },
});

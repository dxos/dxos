//
// Copyright 2026 DXOS.org
//

import { defineConfig } from '../../../vite.base.config.ts';

export default defineConfig({
  entry: {
    index: 'src/index.ts',
    SteCheck: 'src/check/SteCheck.ts',
    SteOperation: 'src/operations/SteOperation.ts',
    SteSkill: 'src/skills/SteSkill.ts',
    operations: 'src/operations/index.ts',
    skills: 'src/skills/index.ts',
  },
  test: { node: true },
});

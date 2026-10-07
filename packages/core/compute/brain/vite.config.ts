//
// Copyright 2026 DXOS.org
//

import { defineConfig } from '../../../../vite.base.config.ts';

export default defineConfig({
  entry: {
    index: 'src/index.ts',
    Builtins: 'src/Builtins.ts',
    CompilePrompt: 'src/CompilePrompt.ts',
    Compiler: 'src/Compiler.ts',
    Encoding: 'src/Encoding.ts',
    GoalRules: 'src/GoalRules.ts',
    Vocabulary: 'src/Vocabulary.ts',
    testing: 'src/testing/index.ts',
  },
  test: { node: true },
});

//
// Copyright 2026 DXOS.org
//

import { defineConfig } from '../../../../vite.base.config.ts';

export default defineConfig({
  entry: {
    index: 'src/index.ts',
    Brain: 'src/Brain.ts',
    Builtins: 'src/Builtins.ts',
    CompilePrompt: 'src/CompilePrompt.ts',
    Compiler: 'src/Compiler.ts',
    Encoding: 'src/Encoding.ts',
    Event: 'src/Event.ts',
    Fact: 'src/Fact.ts',
    GoalRules: 'src/GoalRules.ts',
    Rule: 'src/Rule.ts',
    Vocabulary: 'src/Vocabulary.ts',
    testing: 'src/testing/index.ts',
  },
  test: { node: true },
});

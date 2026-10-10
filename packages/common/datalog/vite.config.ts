//
// Copyright 2026 DXOS.org
//

import { defineConfig } from '../../../vite.base.config.ts';

export default defineConfig({
  entry: {
    index: 'src/index.ts',
    Ast: 'src/Ast.ts',
    Builtin: 'src/Builtin.ts',
    Checker: 'src/Checker.ts',
    Engine: 'src/Engine.ts',
    Parser: 'src/Parser.ts',
  },
  test: { node: true, workerd: true },
});

//
// Copyright 2026 DXOS.org
//

import { defineConfig } from '../../../vite.base.config.ts';

export default defineConfig({
  entry: {
    AtomEx: 'src/AtomEx.ts',
    DynamicRuntime: 'src/dynamic-runtime.ts',
    EffectEx: 'src/EffectEx.ts',
    GlobalValue: 'src/internal/GlobalValue.ts',
    Hook: 'src/Hook.ts',
    Performance: 'src/Performance.ts',
    RuntimeProvider: 'src/RuntimeProvider.ts',
    SchemaAST: 'src/internal/schema-ast.ts',
    SchemaEx: 'src/SchemaEx.ts',
    SpanAttributes: 'src/SpanAttributes.ts',
    Yield: 'src/Yield.ts',
    index: 'src/index.ts',
    testing: 'src/testing.ts',
  },
  test: { node: true },
});

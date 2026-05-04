// Copyright 2026 DXOS.org

import { defineConfig } from '@dxos/dx-tsdown/config';

export default defineConfig({
  entry: [
    'src/index.ts',
    'src/internal/index.ts',
    'src/testing/index.ts',
    'src/Entity.ts',
    'src/Obj.ts',
    'src/Annotation.ts',
    'src/Database.ts',
    'src/Err.ts',
    'src/Feed.ts',
    'src/Filter.ts',
    'src/Format.ts',
    'src/Relation.ts',
    'src/Ref.ts',
    'src/JsonSchema.ts',
    'src/QueryResult.ts',
    'src/Query.ts',
    'src/SchemaRegistry.ts',
    'src/Tag.ts',
    'src/Order.ts',
    'src/Key.ts',
    'src/Migration.ts',
    'src/Type.ts',
    'src/Extension.ts',
  ],
  platform: ['neutral'],
});

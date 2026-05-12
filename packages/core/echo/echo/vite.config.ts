//
// Copyright 2026 DXOS.org
//

import { defineConfig } from '../../../../vite.base.config.ts';

export default defineConfig({
  entry: {
    index: 'src/index.ts',
    internal: 'src/internal/index.ts',
    testing: 'src/testing/index.ts',
    Entity: 'src/Entity.ts',
    Obj: 'src/Obj.ts',
    Annotation: 'src/Annotation.ts',
    Database: 'src/Database.ts',
    Err: 'src/Err.ts',
    Feed: 'src/Feed.ts',
    Filter: 'src/Filter.ts',
    Format: 'src/Format.ts',
    Relation: 'src/Relation.ts',
    Ref: 'src/Ref.ts',
    JsonSchema: 'src/JsonSchema.ts',
    QueryResult: 'src/QueryResult.ts',
    Query: 'src/Query.ts',
    SchemaRegistry: 'src/SchemaRegistry.ts',
    Tag: 'src/Tag.ts',
    Order: 'src/Order.ts',
    Key: 'src/Key.ts',
    Migration: 'src/Migration.ts',
    Type: 'src/Type.ts',
    Extension: 'src/Extension.ts',
  },
  test: { node: true },
});

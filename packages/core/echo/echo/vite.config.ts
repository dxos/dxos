//
// Copyright 2026 DXOS.org
//

import { defineConfig } from '../../../../vite.base.config.ts';

export default defineConfig({
  entry: {
    index: 'src/index.ts',
    internal: 'src/internal/index.ts',
    testing: 'src/testing/index.ts',
    Annotation: 'src/Annotation.ts',
    Database: 'src/Database.ts',
    Entity: 'src/Entity.ts',
    Err: 'src/Err.ts',
    Feed: 'src/Feed.ts',
    Filter: 'src/Filter.ts',
    Format: 'src/Format.ts',
    JsonSchema: 'src/JsonSchema.ts',
    Key: 'src/Key.ts',
    Migration: 'src/Migration.ts',
    Obj: 'src/Obj.ts',
    Order: 'src/Order.ts',
    Query: 'src/Query.ts',
    QueryResult: 'src/QueryResult.ts',
    Ref: 'src/Ref.ts',
    Relation: 'src/Relation.ts',
    SchemaRegistry: 'src/SchemaRegistry.ts',
    Tag: 'src/Tag.ts',
    Type: 'src/Type.ts',
    Extension: 'src/Extension.ts',
  },
  test: { node: true },
});

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
    Blob: 'src/Blob.ts',
    Database: 'src/Database.ts',
    Error: 'src/Error.ts',
    Feed: 'src/Feed.ts',
    Filter: 'src/Filter.ts',
    Format: 'src/Format.ts',
    Relation: 'src/Relation.ts',
    Ref: 'src/Ref.ts',
    Registry: 'src/Registry.ts',
    Scope: 'src/Scope.ts',
    JsonSchema: 'src/JsonSchema.ts',
    QueryResult: 'src/QueryResult.ts',
    Query: 'src/Query.ts',
    Tag: 'src/Tag.ts',
    Text: 'src/Text.ts',
    Order: 'src/Order.ts',
    Key: 'src/Key.ts',
    Migration: 'src/Migration.ts',
    Type: 'src/Type.ts',
    Aggregate: 'src/Aggregate.ts',
    Collection: 'src/Collection.ts',
    Dataset: 'src/Dataset.ts',
    Hypergraph: 'src/Hypergraph.ts',
    Json: 'src/Json.ts',
    View: 'src/View.ts',
  },
  test: { node: true },
});

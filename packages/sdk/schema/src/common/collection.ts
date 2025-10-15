//
// Copyright 2024 DXOS.org
//

import * as Schema from 'effect/Schema';

import { QueryAST, Type } from '@dxos/echo';

export const Collection = Schema.Struct({
  name: Schema.optional(Schema.String),
  objects: Schema.mutable(Schema.Array(Type.Ref(Type.Expando))),
}).pipe(
  Type.Obj({
    typename: 'dxos.org/type/Collection',
    version: '0.1.0',
  }),
);

export type Collection = Schema.Schema.Type<typeof Collection>;

// TODO(wittjosiah): Remove. Use View instead.
const QueryCollection_ = Schema.Struct({
  name: Schema.optional(Schema.String),
  query: QueryAST.Query,
}).pipe(
  Type.Obj({
    typename: 'dxos.org/type/QueryCollection',
    version: '0.1.0',
  }),
);

export type QueryCollection = Schema.Schema.Type<typeof QueryCollection_>;
export type QueryCollectionEncoded = Schema.Schema.Encoded<typeof QueryCollection_>;
export const QueryCollection: Schema.Schema<QueryCollection, QueryCollectionEncoded> = QueryCollection_;

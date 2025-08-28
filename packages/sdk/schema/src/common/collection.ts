//
// Copyright 2024 DXOS.org
//

import { Schema } from 'effect';

import { Type } from '@dxos/echo';
import { QueryType } from '@dxos/echo/internal';

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

export const QueryCollection = Schema.Struct({
  name: Schema.optional(Schema.String),
  query: QueryType,
}).pipe(
  Type.Obj({
    typename: 'dxos.org/type/QueryCollection',
    version: '0.1.0',
  }),
);

export type QueryCollection = Schema.Schema.Type<typeof QueryCollection>;

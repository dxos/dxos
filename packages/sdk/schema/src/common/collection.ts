//
// Copyright 2024 DXOS.org
//

import * as Schema from 'effect/Schema';

import { Obj, QueryAST, Type } from '@dxos/echo';
import { FormAnnotation } from '@dxos/echo/internal';

export const Collection = Schema.Struct({
  name: Schema.String.pipe(Schema.optional),
  objects: Type.Ref(Type.Expando).pipe(Schema.Array, Schema.mutable, FormAnnotation.set(false)),
}).pipe(
  Type.Obj({
    typename: 'dxos.org/type/Collection',
    version: '0.1.0',
  }),
);

export type Collection = Schema.Schema.Type<typeof Collection>;

export const make = (props: Partial<Obj.MakeProps<typeof Collection>> = {}) =>
  Obj.make(Collection, { objects: [], ...props });

// TODO(wittjosiah): Remove. Use View instead.
const QueryCollection_ = Schema.Struct({
  name: Schema.String.pipe(Schema.optional),
  query: QueryAST.Query.pipe(FormAnnotation.set(false)),
}).pipe(
  Type.Obj({
    typename: 'dxos.org/type/QueryCollection',
    version: '0.1.0',
  }),
);

/** @deprecated */
export type QueryCollection = Schema.Schema.Type<typeof QueryCollection_>;
export type QueryCollectionEncoded = Schema.Schema.Encoded<typeof QueryCollection_>;
export const QueryCollection: Schema.Schema<QueryCollection, QueryCollectionEncoded> = QueryCollection_;

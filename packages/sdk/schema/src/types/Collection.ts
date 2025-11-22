//
// Copyright 2024 DXOS.org
//

import * as Effect from 'effect/Effect';
import * as Schema from 'effect/Schema';

import { PropertiesType } from '@dxos/client-protocol/types';
import { Annotation, Obj, Query, QueryAST, Ref, Type } from '@dxos/echo';
import { type Expando } from '@dxos/echo/internal';
import { DatabaseService } from '@dxos/echo-db';
import { invariant } from '@dxos/invariant';

export const Collection = Schema.Struct({
  name: Schema.String.pipe(Schema.optional),
  objects: Type.Ref(Type.Expando).pipe(Schema.Array, Schema.mutable, Annotation.FormAnnotation.set(false)),
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
  query: QueryAST.Query.pipe(Annotation.FormAnnotation.set(false)),
}).pipe(
  Type.Obj({
    typename: 'dxos.org/type/QueryCollection',
    version: '0.1.0',
  }),
);

/** @deprecated */
export type QueryCollection = Schema.Schema.Type<typeof QueryCollection_>;
export type QueryCollectionEncoded = Schema.Schema.Encoded<typeof QueryCollection_>;
/** @deprecated */
export const QueryCollection: Schema.Schema<QueryCollection, QueryCollectionEncoded> = QueryCollection_;

type AddParams = {
  object: Obj.Any;
  target?: Collection;
  hidden?: boolean;
};

export const add = Effect.fn(function* ({ object, target, hidden }: AddParams) {
  if (Obj.instanceOf(Collection, target)) {
    target.objects.push(Ref.make(object));
  } else if (hidden) {
    yield* DatabaseService.add(object);
  } else {
    const { objects } = yield* DatabaseService.runQuery(Query.type(PropertiesType));
    invariant(objects.length === 1, 'Space properties not found');
    const properties: Expando = objects[0];

    const collection = properties[Collection.typename]?.target;
    if (Obj.instanceOf(Collection, collection)) {
      collection.objects.push(Ref.make(object));
    } else {
      // TODO(wittjosiah): Can't add non-echo objects by including in a collection because of types.
      const collection = Obj.make(Collection, { objects: [Ref.make(object)] });
      properties[Collection.typename] = Ref.make(collection);
    }
  }
});

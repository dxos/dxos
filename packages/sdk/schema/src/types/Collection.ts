//
// Copyright 2024 DXOS.org
//

import * as Effect from 'effect/Effect';
import * as Schema from 'effect/Schema';

<<<<<<< HEAD
import { SpaceProperties } from '@dxos/client-protocol/types';
import { Annotation, Obj, Query, QueryAST, Ref, Type } from '@dxos/echo';
||||||| 87517e966b
import { PropertiesType } from '@dxos/client-protocol/types';
import { Obj, Query, QueryAST, Ref, Type } from '@dxos/echo';
import { type Expando, FormAnnotation } from '@dxos/echo/internal';
=======
import { PropertiesType } from '@dxos/client-protocol/types';
import { Obj, Query, Ref, Type } from '@dxos/echo';
import { type Expando, FormInputAnnotation, SystemTypeAnnotation } from '@dxos/echo/internal';
>>>>>>> main
import { DatabaseService } from '@dxos/echo-db';
import { invariant } from '@dxos/invariant';

export const Collection = Schema.Struct({
  name: Schema.String.pipe(Schema.optional),
<<<<<<< HEAD
  objects: Type.Ref(Type.Expando).pipe(Schema.Array, Schema.mutable, Annotation.FormAnnotation.set(false)),
||||||| 87517e966b
  objects: Type.Ref(Type.Expando).pipe(Schema.Array, Schema.mutable, FormAnnotation.set(false)),
=======
  objects: Schema.Array(Type.Ref(Type.Expando)).pipe(Schema.mutable, FormInputAnnotation.set(false)),
>>>>>>> main
}).pipe(
  Type.Obj({
    typename: 'dxos.org/type/Collection',
    version: '0.1.0',
  }),
);

export type Collection = Schema.Schema.Type<typeof Collection>;

export const make = (props: Partial<Obj.MakeProps<typeof Collection>> = {}) =>
  Obj.make(Collection, { objects: [], ...props });

<<<<<<< HEAD
// TODO(wittjosiah): Remove. Use View instead.
const QueryCollection_ = Schema.Struct({
  name: Schema.String.pipe(Schema.optional),
  query: QueryAST.Query.pipe(Annotation.FormAnnotation.set(false)),
||||||| 87517e966b
// TODO(wittjosiah): Remove. Use View instead.
const QueryCollection_ = Schema.Struct({
  name: Schema.String.pipe(Schema.optional),
  query: QueryAST.Query.pipe(FormAnnotation.set(false)),
=======
/**
 * System collections are used runtime collections of nodes in the app graph.
 * The purpose of this object is to allow them to be ordered within the root collection.
 */
export const Managed = Schema.Struct({
  key: Schema.String,
>>>>>>> main
}).pipe(
  Type.Obj({
    typename: 'dxos.org/type/ManagedCollection',
    version: '0.1.0',
  }),
  SystemTypeAnnotation.set(true),
);

export type Managed = Schema.Schema.Type<typeof Managed>;

export const makeManaged = (props: Obj.MakeProps<typeof Managed>) => Obj.make(Managed, props);

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
    const { objects } = yield* DatabaseService.runQuery(Query.type(SpaceProperties));
    invariant(objects.length === 1, 'Space properties not found');
    const properties: Type.Expando = objects[0];

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

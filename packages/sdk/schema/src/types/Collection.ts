//
// Copyright 2024 DXOS.org
//

import * as Effect from 'effect/Effect';
import * as Schema from 'effect/Schema';

import { SpaceProperties } from '@dxos/client-protocol/types';
import { Obj, Query, Ref, Type } from '@dxos/echo';
import { Database } from '@dxos/echo';
import { FormInputAnnotation, SystemTypeAnnotation } from '@dxos/echo/internal';
import { invariant } from '@dxos/invariant';

export const Collection = Schema.Struct({
  name: Schema.String.pipe(Schema.optional),
  objects: Schema.Array(Type.Ref(Type.Obj)).pipe(Schema.mutable, FormInputAnnotation.set(false)),
}).pipe(
  Type.object({
    typename: 'dxos.org/type/Collection',
    version: '0.1.0',
  }),
);

export type Collection = Schema.Schema.Type<typeof Collection>;

export const make = (props: Partial<Obj.MakeProps<typeof Collection>> = {}): Collection =>
  Obj.make(Collection, { objects: [], ...props });

/**
 * System collections are used runtime collections of nodes in the app graph.
 * The purpose of this object is to allow them to be ordered within the root collection.
 */
export const Managed = Schema.Struct({
  key: Schema.String,
}).pipe(
  Type.object({
    typename: 'dxos.org/type/ManagedCollection',
    version: '0.1.0',
  }),
  SystemTypeAnnotation.set(true),
);

export type Managed = Schema.Schema.Type<typeof Managed>;

export const makeManaged = (props: Obj.MakeProps<typeof Managed>): Managed => Obj.make(Managed, props);

type AddProps = {
  object: Obj.Unknown;
  target?: Collection;
  hidden?: boolean;
};

export const add = Effect.fn(function* ({ object, target, hidden }: AddProps) {
  const objectRef = Ref.make(object);
  if (Obj.instanceOf(Collection, target)) {
    Obj.change(target, (t) => {
      t.objects.push(objectRef);
    });
  } else if (hidden) {
    yield* Database.Service.add(object);
  } else {
    const objects = yield* Database.Service.runQuery(Query.type(SpaceProperties));
    invariant(objects.length === 1, 'Space properties not found');
    const properties: Obj.Any = objects[0];

    const collectionRef: Ref.Ref<Collection> | undefined = properties[Collection.typename];
    if (collectionRef) {
      const collection = yield* Effect.promise(() => collectionRef.load());
      Obj.change(collection, (c) => {
        c.objects.push(objectRef);
      });
    } else {
      const newCollection = Obj.make(Collection, { objects: [objectRef] });
      const collectionRef = Ref.make(newCollection);
      Obj.change(properties, (p) => {
        p[Collection.typename] = collectionRef;
      });
    }
  }
});

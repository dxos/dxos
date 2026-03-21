//
// Copyright 2026 DXOS.org
//

// @import-as-namespace

import * as Effect from 'effect/Effect';

import { SpaceProperties } from '@dxos/client-protocol/types';
import { Collection, Database, Obj, Query, Ref } from '@dxos/echo';
import { invariant } from '@dxos/invariant';

type AddProps = {
  object: Obj.Unknown;
  target?: Collection.Collection;
  hidden?: boolean;
};

// TODO(dmaretskyi): Move up to the composer level.
export const add = Effect.fn(function* ({ object, target, hidden }: AddProps) {
  const objectRef = Ref.make(object);
  if (Collection.isCollection(target)) {
    Obj.change(target, (target) => {
      target.objects.push(objectRef);
    });
  } else if (hidden) {
    yield* Database.add(object);
  } else {
    const objects = yield* Database.runQuery(Query.type(SpaceProperties));
    invariant(objects.length === 1, 'Space properties not found');
    const properties: Obj.Any = objects[0];

    const collectionRef: Ref.Ref<Collection.Collection> | undefined = properties[Collection.Collection.typename];
    if (collectionRef) {
      const collection = yield* Effect.promise(() => collectionRef.load());
      Obj.change(collection, (collection) => {
        collection.objects.push(objectRef);
      });
    } else {
      const newCollection = Collection.make({ objects: [objectRef] });
      const collectionRef = Ref.make(newCollection);
      Obj.change(properties, (properties) => {
        properties[Collection.Collection.typename] = collectionRef;
      });
    }
  }
});

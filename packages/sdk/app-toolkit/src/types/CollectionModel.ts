//
// Copyright 2026 DXOS.org
//

// @import-as-namespace

import * as Effect from 'effect/Effect';
import * as Option from 'effect/Option';

import { SpaceProperties } from '@dxos/client-protocol/types';
import { Annotation, Collection, Database, Obj, Query, Ref } from '@dxos/echo';
import { invariant } from '@dxos/invariant';

import { AppAnnotation } from '../echo';
import * as AppNode from '../app-graph/AppNode';

type AddProps = {
  object: Obj.Unknown;
  target?: Collection.Collection;
};

export const add = Effect.fn(function* ({ object, target }: AddProps) {
  const objectRef = Ref.make(object);
  if (Collection.isCollection(target)) {
    Obj.update(target, (target) => {
      target.objects.push(objectRef);
    });
  } else if (!AppNode.isCollectionItem(object)) {
    yield* Database.add(object);
  } else {
    const objects = yield* Database.query(Query.type(SpaceProperties)).run;
    invariant(objects.length === 1, 'Space properties not found');
    const properties: Obj.Any = objects[0];

    const collectionRef = Annotation.get(properties, AppAnnotation.RootCollectionAnnotation).pipe(
      Option.getOrUndefined,
    );
    if (collectionRef) {
      const collection = yield* Database.load(collectionRef);
      Obj.update(collection, (collection) => {
        collection.objects.push(objectRef);
      });
    } else {
      const newCollection = Collection.make({ objects: [objectRef] });
      const newCollectionRef = Ref.make(newCollection);
      Obj.update(properties, (properties) => {
        const meta = Obj.getMeta(properties);
        if (!meta.annotations) {
          meta.annotations = {};
        }
        Annotation.setDictionary(meta.annotations, AppAnnotation.RootCollectionAnnotation, newCollectionRef);
      });
    }
  }
});

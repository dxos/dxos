//
// Copyright 2026 DXOS.org
//

// @import-as-namespace

import * as Effect from 'effect/Effect';
import * as Option from 'effect/Option';

import { SpaceProperties } from '@dxos/client-protocol/types';
import { Annotation, Collection, Database, Obj, Query, Ref } from '@dxos/echo';
import { invariant } from '@dxos/invariant';

import * as AppNode from '../app-graph/AppNode';
import { AppAnnotation } from '../echo';

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
    // A fully-scaffolded space has exactly one SpaceProperties carrying the root collection; more than
    // one is corruption and must fail fast.
    invariant(objects.length <= 1, 'Multiple SpaceProperties objects found');
    // In a bare database (e.g. a headless/agent test harness) it may be absent; rather than assert,
    // fall back to persisting the object directly so collection-aware operations still work.
    if (objects.length === 0) {
      if (!Obj.getDatabase(object)) {
        yield* Database.add(object);
      }
      return;
    }
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

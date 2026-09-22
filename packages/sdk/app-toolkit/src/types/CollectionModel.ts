//
// Copyright 2026 DXOS.org
//

// @import-as-namespace

import * as Effect from 'effect/Effect';
import * as Option from 'effect/Option';

import { SpaceProperties } from '@dxos/client-protocol/types';
import { Annotation, Collection, Database, Filter, Obj, Query, Ref, Type } from '@dxos/echo';
import { invariant } from '@dxos/invariant';
import { EID } from '@dxos/keys';
import { CollectionItemAnnotation } from '@dxos/schema';

import { AppAnnotation } from '../echo/index.ts';

type AddProps = {
  object: Obj.Unknown;
  /** The object's parent; absent, the object files at the space root. */
  target?: Obj.Unknown;
};

/**
 * Query for the collections that directly contain the object.
 * Use it to file a new object alongside an existing one (e.g. a sibling created from within a document).
 */
export const containing = (object: Obj.Unknown): Query.Query<Collection.Collection> =>
  Query.select(Filter.id(object.id)).referencedBy(Collection.Collection, 'objects');

/**
 * Whether the object's type is annotated hidden. Unregistered types (e.g. a snapshot whose type
 * entity isn't wired up) read as visible — the same default the navtree's type branches use.
 */
const isHidden = (object: Obj.Unknown): boolean => {
  const type = Obj.getType(object);
  return type ? Annotation.HiddenAnnotation.get(Type.getSchema(type)).pipe(Option.getOrElse(() => false)) : false;
};

/** Returns true when the object is eligible to live inside a collection. */
export const isCollectionItem = (object: Obj.Unknown): boolean => {
  if (Obj.instanceOf(Collection.Collection, object)) {
    return true;
  }
  const type = Obj.getType(object);
  if (!type) {
    return false;
  }
  return CollectionItemAnnotation.get(Type.getSchema(type)).pipe(Option.getOrElse(() => false));
};

/** The entity a ref names, whether it is addressed locally or space-qualified. */
const refEntityId = (ref: Ref.Ref<any>): string | undefined => {
  const eid = EID.tryParse(ref.uri);
  return eid ? EID.getEntityId(eid) : undefined;
};

const indexOf = (collection: Collection.Collection, object: Obj.Unknown): number =>
  collection.objects.findIndex((ref) => refEntityId(ref) === object.id);

type MoveProps = {
  object: Obj.Unknown;
  from?: Collection.Collection;
  to: Collection.Collection;
  /** Position in the destination; appended when absent. */
  index?: number;
};

/** Moves an object between collections; ownership follows only when `from` owned it. */
export const move = ({ object, from, to, index }: MoveProps): void => {
  if (from?.id === to.id) {
    return;
  }
  const owned = Obj.isOwnedBy(object, from);
  const objectRef = Ref.make(object);
  Obj.update(to, (to) => {
    if (indexOf(to, object) === -1) {
      if (index === undefined) {
        to.objects.push(objectRef);
      } else {
        to.objects.splice(index, 0, objectRef);
      }
    }
  });
  if (from) {
    Obj.update(from, (from) => {
      const idx = indexOf(from, object);
      if (idx > -1) {
        from.objects.splice(idx, 1);
      }
    });
  }
  if (owned) {
    Obj.setParent(object, to);
  }
};

/** Drops the object's ref from the collection, leaving the object and its parent alone. */
export const unlink = ({ object, from }: { object: Obj.Unknown; from: Collection.Collection }): void => {
  Obj.update(from, (from) => {
    const idx = indexOf(from, object);
    if (idx > -1) {
      from.objects.splice(idx, 1);
    }
  });
};

/** A target that is not a collection files the object itself, so there is nothing to file here. */
const filesItself = (target: Obj.Unknown | undefined): boolean =>
  target !== undefined && !Collection.isCollection(target);

export const add = Effect.fn(function* ({ object, target }: AddProps) {
  const objectRef = Ref.make(object);
  if (isHidden(object) || filesItself(target)) {
    if (!Obj.getDatabase(object)) {
      yield* Database.add(object);
    }
    return;
  }

  if (Collection.isCollection(target)) {
    Obj.update(target, (target) => {
      target.objects.push(objectRef);
    });
  } else if (!isCollectionItem(object)) {
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

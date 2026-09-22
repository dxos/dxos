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
  /**
   * The object that will hold this one. A collection files it; any other holder — a project taking
   * it into its artifacts — files it nowhere, since only the holder knows how it keeps what it
   * owns. Absent, the object files at the space root.
   */
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

/**
 * Returns true when the object is eligible to live inside a collection:
 * collections are always eligible; other types require {@link CollectionItemAnnotation}.
 */
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

/**
 * Whether `holder` is where the object really lives, as opposed to holding a link to it.
 *
 * An object with no parent reads as canonical everywhere: nothing has claimed it, which is the
 * state of every object filed before collections began claiming what they hold.
 */
export const isCanonicalHolder = (object: Obj.Unknown, holder: Obj.Unknown | undefined): boolean => {
  const parent = Obj.getParent(object);
  return parent === undefined || parent.id === holder?.id;
};

/** Index of the object's ref in the collection, or -1. Matched by entity id, since the same object
 * may be addressed by a local or a space-qualified URI. */
const indexOf = (collection: Collection.Collection, object: Obj.Unknown): number =>
  collection.objects.findIndex((ref) => {
    const eid = EID.tryParse(ref.uri);
    return eid ? EID.getEntityId(eid) === object.id : false;
  });

type MoveProps = {
  object: Obj.Unknown;
  /** The collection the object is leaving, when it is leaving one. */
  from?: Collection.Collection;
  to: Collection.Collection;
  /** Position in the destination; appended when absent. */
  index?: number;
};

/**
 * Moves an object between collections, carrying ownership with it.
 *
 * Ownership follows only when `from` was the object's canonical holder — moving a link moves the
 * link and leaves the object where it lives. Removing a ref never clears a parent on its own, so a
 * move cannot be expressed as an unlink followed by an add.
 */
export const move = ({ object, from, to, index }: MoveProps): void => {
  if (from?.id === to.id) {
    return;
  }
  const canonical = isCanonicalHolder(object, from);
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
  // After the destination holds the ref, so the parent edge it declares is already there.
  if (canonical) {
    Obj.setParent(object, to);
  }
};

/**
 * Sorts the results of a reference traversal back into the holder's array order.
 *
 * Membership is read with `Query.select(Filter.entity(holder)).reference('<prop>')` rather than by
 * dereferencing the array, because the query engine treats a deleted target as absent and so never
 * hands a caller a dangling entry. A query does not preserve order and the array is the order, so
 * the two halves belong together. An object the array does not name sorts last.
 */
export const orderByRefs = <T extends Obj.Unknown>(objects: readonly T[], refs: readonly Ref.Ref<any>[]): T[] => {
  const position = new Map<string, number>();
  refs.forEach((ref, index) => {
    const eid = EID.tryParse(ref.uri);
    const id = eid ? EID.getEntityId(eid) : undefined;
    // First occurrence wins: concurrent edits can merge the same ref into an array twice.
    if (id !== undefined && !position.has(id)) {
      position.set(id, index);
    }
  });
  return [...objects].sort(
    (a, b) => (position.get(a.id) ?? Number.MAX_SAFE_INTEGER) - (position.get(b.id) ?? Number.MAX_SAFE_INTEGER),
  );
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

export const add = Effect.fn(function* ({ object, target }: AddProps) {
  const objectRef = Ref.make(object);
  // Two reasons an object joins no collection, one about the type and one about this call.
  // A hidden type is an implementation detail reached through a ref on its owner (a sketch's
  // canvas, a game's variant state), so it never files anywhere; filing one would surface it as a
  // sibling of the object that owns it. A holder that is not a collection keeps what it owns its
  // own way — a project in its artifacts — and filing here as well would show the object twice.
  if (isHidden(object) || (target !== undefined && !Collection.isCollection(target))) {
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

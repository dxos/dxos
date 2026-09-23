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

import { type Translations } from '../app/index.ts';
import { AppAnnotation } from '../echo/index.ts';

/** An object that lists other objects in one of its ref-array fields, owning only some of them. */
export type Container = {
  /** The object holding the list, and the parent of the children it owns. */
  readonly object: Obj.Unknown;
  /** The ref-array field on `object` that lists the children. */
  readonly property: string;
  /** Containers sharing a scope move children between them; a drop from anywhere else links. */
  readonly moveScope?: string;
  /** Which objects the list takes; any object when absent. */
  readonly accepts?: (object: Obj.Unknown) => boolean;
  readonly removeLabel?: Translations.Label;
};

type RefArrayKeys<T> = {
  [K in keyof T]-?: NonNullable<T[K]> extends readonly Ref.Ref<any>[] ? K : never;
}[keyof T] &
  string;

export const make = <T extends Obj.Unknown>(
  object: T,
  property: RefArrayKeys<T>,
  options: Pick<Container, 'moveScope' | 'accepts' | 'removeLabel'> = {},
): Container => ({ object, property, ...options });

const refs = (container: Container): Ref.Ref<Obj.Unknown>[] => {
  const value = (container.object as any)[container.property];
  invariant(Array.isArray(value), `${container.property} is not a list`);
  return value;
};

const refEntityId = (ref: Ref.Ref<any>): string | undefined => {
  const eid = EID.tryParse(ref.uri);
  return eid ? EID.getEntityId(eid) : undefined;
};

export const indexOf = (container: Container, object: Obj.Unknown): number =>
  refs(container).findIndex((ref) => refEntityId(ref) === object.id);

export const includes = (container: Container, object: Obj.Unknown): boolean => indexOf(container, object) > -1;

/** Whether the container only lists an object whose parent is `parent`; an object with no parent is its own. */
export const isLink = (container: Container, parent: Obj.Unknown | undefined): boolean =>
  parent !== undefined && parent.id !== container.object.id;

type LinkProps = {
  container: Container;
  object: Obj.Unknown;
  /** Position in the list; appended when absent. */
  index?: number;
};

/** Lists the object, leaving its parent alone; a no-op when it is listed already or not accepted. */
export const link = ({ container, object, index }: LinkProps): void => {
  if (container.accepts?.(object) === false || includes(container, object)) {
    return;
  }
  const objectRef = Ref.make(object);
  Obj.update(container.object, (mutable: any) => {
    const list = mutable[container.property];
    if (index === undefined) {
      list.push(objectRef);
    } else {
      list.splice(index, 0, objectRef);
    }
  });
};

/** Drops the object from the list, leaving the object and its parent alone. */
export const unlink = ({ container, object }: Omit<LinkProps, 'index'>): void => {
  const index = indexOf(container, object);
  if (index === -1) {
    return;
  }
  Obj.update(container.object, (mutable: any) => {
    mutable[container.property].splice(index, 1);
  });
};

/** Replaces the list with `objects`, in that order. */
export const reorder = ({ container, objects }: { container: Container; objects: readonly Obj.Unknown[] }): void => {
  Obj.update(container.object, (mutable: any) => {
    mutable[container.property] = objects.map((object) => Ref.make(object));
  });
};

/** Moves the object between lists; ownership follows only when `from` owned it. */
export const move = ({
  object,
  from,
  to,
  index,
}: Omit<LinkProps, 'container'> & { from: Container; to: Container }): void => {
  if (from.object.id === to.object.id && from.property === to.property) {
    return;
  }
  const owned = Obj.isOwnedBy(object, from.object);
  link({ container: to, object, index });
  unlink({ container: from, object });
  if (owned) {
    Obj.setParent(object, to.object);
  }
};

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

const MOVE_SCOPE = 'collection';

/** A collection's list of objects. */
export const collection = (target: Collection.Collection): Container =>
  make(target, 'objects', { moveScope: MOVE_SCOPE, accepts: isCollectionItem });

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

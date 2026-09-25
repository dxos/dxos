//
// Copyright 2026 DXOS.org
//

// @import-as-namespace

import * as Effect from 'effect/Effect';

import { Collection, Database, Filter, Obj, Query, Ref } from '@dxos/echo';
import { invariant } from '@dxos/invariant';
import { EID } from '@dxos/keys';

import { type Translations } from '../app/index.ts';
import { TypeOptions } from '../echo/index.ts';

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

const indexOf = (container: Container, object: Obj.Unknown): number =>
  refs(container).findIndex((ref) => refEntityId(ref) === object.id);

export const includes = (container: Container, object: Obj.Unknown): boolean => indexOf(container, object) > -1;

/** Whether the container only lists an object whose parent is `parent`; an object with no parent is its own. */
export const isLink = (container: Container, parent: Obj.Unknown | undefined): boolean =>
  parent !== undefined && parent.id !== container.object.id;

/** Whether adding the object leaves it only listed here; `from` is the container it moves out of, if any. */
export const wouldLink = ({
  container,
  object,
  from,
}: {
  container: Container;
  object: Obj.Unknown;
  from?: Container;
}): boolean => {
  const parent = Obj.getParent(object);
  return from !== undefined && parent?.id === from.object.id ? false : isLink(container, parent);
};

type LinkProps = {
  container: Container;
  object: Obj.Unknown;
  /** Position in the list; appended when absent. */
  index?: number;
};

const assertAccepts = (container: Container, object: Obj.Unknown): void =>
  invariant(container.accepts?.(object) !== false, `${container.property} does not take ${Obj.getTypename(object)}`);

/** Lists the object, leaving its parent alone; a no-op when it is listed already. Throws when not accepted. */
export const link = ({ container, object, index }: LinkProps): void => {
  assertAccepts(container, object);
  insert({ container, object, index });
};

const insert = ({ container, object, index }: LinkProps): void => {
  if (includes(container, object)) {
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

/** Puts `objects` in the given order across the slots they hold, leaving every other entry in place. */
export const reorder = ({ container, objects }: { container: Container; objects: readonly Obj.Unknown[] }): void => {
  // The caller's view can lag the list; a reorder never changes which objects the list holds.
  const listed = new Set(refs(container).map(refEntityId));
  const ordered = objects.filter((object) => listed.has(object.id));
  const ids = new Set(ordered.map((object) => object.id));
  Obj.update(container.object, (mutable: any) => {
    const list: Ref.Ref<Obj.Unknown>[] = mutable[container.property];
    let next = 0;
    for (let index = 0; index < list.length && next < ordered.length; index++) {
      const id = refEntityId(list[index]);
      if (id === undefined || !ids.has(id)) {
        continue;
      }
      const object = ordered[next++];
      if (id !== object.id) {
        list.splice(index, 1, Ref.make(object));
      }
    }
  });
};

/** Drops the object from the list as it leaves for `to`; a container that owned it hands it to `to`. */
export const release = ({ container, object, to }: Omit<LinkProps, 'index'> & { to?: Container }): void => {
  unlink({ container, object });
  if (Obj.getParent(object)?.id === container.object.id) {
    Obj.setParent(object, to?.object);
  }
};

type AddProps = {
  object: Obj.Unknown;
  /** The object's parent; absent, the object is only persisted. */
  target?: Obj.Unknown;
};

/**
 * Query for the collections that directly contain the object.
 * Use it to file a new object alongside an existing one (e.g. a sibling created from within a document).
 */
export const containing = (object: Obj.Unknown): Query.Query<Collection.Collection> =>
  Query.select(Filter.id(object.id)).referencedBy(Collection.Collection, 'objects');

const MOVE_SCOPE = 'collection';

/** A collection's list of objects; it takes any object of a user-facing type. */
// TODO(wittjosiah): Declare what a list takes on the field itself (e.g. an annotation on `Collection.objects`
//   naming the type annotation its targets must carry), so ECHO can enforce it instead of each caller.
export const collection = (target: Collection.Collection): Container =>
  make(target, 'objects', { moveScope: MOVE_SCOPE, accepts: TypeOptions.isUserObject });

/** Whether {@link add} takes the object for the target: always, unless the target is a collection that refuses it. */
export const canAdd = ({ object, target }: AddProps): boolean =>
  !Collection.isCollection(target) || collection(target).accepts?.(object) !== false;

/**
 * Persists the object and, when the target is a collection, lists it there; a collection takes an object
 * with no parent as its own. Any other target files the object itself, so there is nothing to list.
 * Throws, before persisting anything, when the collection refuses the object.
 */
export const add = Effect.fn(function* ({ object, target }: AddProps) {
  const container = Collection.isCollection(target) ? collection(target) : undefined;
  if (container) {
    assertAccepts(container, object);
  }
  if (!Obj.getDatabase(object)) {
    yield* Database.add(object);
  }
  if (container) {
    insert({ container, object });
  }
});

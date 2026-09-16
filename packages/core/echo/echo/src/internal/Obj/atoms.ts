//
// Copyright 2025 DXOS.org
//

import * as Effect from 'effect/Effect';
import * as Function from 'effect/Function';
import * as Option from 'effect/Option';
import * as AsyncResult from 'effect/unstable/reactivity/AsyncResult';
import * as Atom from 'effect/unstable/reactivity/Atom';

import { assertArgument } from '@dxos/invariant';

import type * as Entity from '../../Entity.ts';
import type * as Obj from '../../Obj.ts';
import type * as Ref from '../../Ref.ts';
import type * as Relation from '../../Relation.ts';
import { subscribe } from '../common/proxy/reactive.ts';
import { getEntityAtoms } from '../Entity/atoms.ts';
import { getDatabase, isEntity } from '../Entity/index.ts';
import { RefTypeId } from '../Ref/ref.ts';
import { loadRefTarget } from '../Ref/utils.ts';
import { isDeleted } from './deleted.ts';
import { getSnapshot } from './snapshot.ts';

const isRef = (obj: unknown): obj is Ref.Ref<any> =>
  obj != null && typeof obj === 'object' && RefTypeId in (obj as object);

const getReactiveOption = <T extends Obj.Unknown>(snapshot: Obj.Snapshot<T>): Effect.Effect<Option.Option<T>, never> =>
  Effect.gen(function* () {
    const db = getDatabase(snapshot as any);
    if (!db) {
      return Option.none();
    }
    const obj = db.getObjectById((snapshot as any).id);
    return obj ? Option.some(obj as T) : Option.none();
  });

/**
 * Atom family for ECHO refs (snapshot version).
 * Uses ref as key — same ref returns same atom.
 * Subscribes to target object changes after loading.
 */
const refFamily = Atom.family(<T extends Obj.Unknown>(ref: Ref.Ref<T>): Atom.Atom<Obj.Snapshot<T> | undefined> => {
  return Atom.make<Obj.Snapshot<T> | undefined>((get) => {
    let unsubscribeTarget: (() => void) | undefined;

    const setupTargetSubscription = (target: T): Obj.Snapshot<T> | undefined => {
      unsubscribeTarget?.();
      unsubscribeTarget = subscribe(target, () => {
        // Deleted objects resolve to undefined so callers don't need to inspect isDeleted.
        // getSnapshot adds SnapshotKindId brand at runtime; cast bridges static types.
        get.setSelf(isDeleted(target) ? undefined : (getSnapshot(target) as unknown as Obj.Snapshot<T>));
      });
      // Guard the initial value too: an already-deleted target must resolve to undefined, not leak a
      // snapshot until the next update.
      return isDeleted(target) ? undefined : (getSnapshot(target) as unknown as Obj.Snapshot<T>);
    };

    get.addFinalizer(() => {
      unsubscribeTarget?.();
    });

    return loadRefTarget(ref, get, setupTargetSubscription);
  });
});

/**
 * Atom family for ECHO refs — returns the live reactive object, not a snapshot.
 */
const refWithReactiveFamily = Atom.family(<T extends Obj.Unknown>(ref: Ref.Ref<T>): Atom.Atom<T | undefined> => {
  const effect = (get: Atom.AtomContext) =>
    Effect.gen(function* () {
      const snapshot = get(makeAtom(ref));
      if (snapshot == null) {
        return undefined;
      }
      const option = yield* getReactiveOption(snapshot);
      return Option.getOrElse(option, () => undefined);
    });

  return Function.pipe(
    Atom.make(effect),
    Atom.map((result) => AsyncResult.getOrElse(result, () => undefined)),
  );
});

/**
 * Atom family for a property of a ref's target object.
 * Resolves the ref (reactively) then projects the property atom, so it fires when the ref resolves or when
 * that property changes. Yields `undefined` while the target is unresolved.
 */
const refPropertyFamily = Atom.family(<T extends Obj.Unknown>(ref: Ref.Ref<T>) =>
  Atom.family(<K extends keyof T>(key: K): Atom.Atom<T[K] | undefined> => {
    return Atom.make<T[K] | undefined>((get) => {
      const target = get(refWithReactiveFamily(ref));
      return target ? get(getEntityAtoms(target).property(key)) : undefined;
    });
  }),
);

/**
 * Create a read-only snapshot atom for a reactive object or ref.
 * Updates automatically when the object is mutated.
 * For refs, subscribes to target object changes after loading.
 */
export const makeAtom: {
  <T extends Obj.Unknown>(obj: T): Atom.Atom<Obj.Snapshot<T>>;
  <T extends Obj.Unknown>(ref: Ref.Ref<T>): Atom.Atom<Obj.Snapshot<T> | undefined>;
} = (objOrRef: Obj.Unknown | Ref.Ref<any>): Atom.Atom<any> => {
  if (isRef(objOrRef)) {
    return refFamily(objOrRef as any);
  }

  const obj = objOrRef as Obj.Unknown;
  assertArgument(isEntity(obj), 'obj', 'Object must be a reactive object');
  return getEntityAtoms(obj).snapshot;
};

/**
 * Create a read-only atom for a specific property of a reactive object, or of a ref's target.
 * Only fires updates when the property value actually changes. Given a ref, the atom resolves the target
 * first and yields `undefined` until it loads.
 */
export const makeProperty: {
  <T extends Obj.Unknown, K extends keyof T>(obj: T, key: K): Atom.Atom<T[K]>;
  <T extends Obj.Unknown, K extends keyof T>(ref: Ref.Ref<T>, key: K): Atom.Atom<T[K] | undefined>;
} = (objOrRef: Obj.Unknown | Ref.Ref<any>, key: any): Atom.Atom<any> => {
  if (isRef(objOrRef)) {
    return refPropertyFamily(objOrRef as Ref.Ref<any>)(key);
  }

  const obj = objOrRef as Obj.Unknown;
  assertArgument(isEntity(obj), 'obj', 'Object must be a reactive object');
  return getEntityAtoms(obj).property(key);
};

/**
 * Like `makeAtom` but returns the live reactive object instead of a snapshot.
 * Prefer `makeAtom` (snapshot) unless you need the live Obj for generic mutations.
 */
export const makeWithReactive: {
  <T extends Obj.Unknown>(obj: T): Atom.Atom<T>;
  <T extends Obj.Unknown>(ref: Ref.Ref<T>): Atom.Atom<T | undefined>;
} = (objOrRef: Obj.Unknown | Ref.Ref<any>): Atom.Atom<any> => {
  if (isRef(objOrRef)) {
    return refWithReactiveFamily(objOrRef as Ref.Ref<any>);
  }

  const obj = objOrRef as Obj.Unknown;
  assertArgument(isEntity(obj), 'obj', 'Object must be a reactive object');
  return getEntityAtoms(obj).live;
};

/**
 * Create a read-only snapshot atom for any ECHO entity (obj or relation).
 * Updates automatically when the entity is mutated.
 */
export const makeEntity = <T extends Entity.Unknown>(entity: T): Atom.Atom<Entity.Snapshot> => {
  assertArgument(isEntity(entity), 'entity', 'Must be a reactive ECHO entity');
  return getEntityAtoms(entity).snapshot;
};

/**
 * Create a read-only snapshot atom for a reactive relation.
 * Updates automatically when the relation is mutated.
 */
export const makeRelation = <T extends Relation.Unknown>(relation: T): Atom.Atom<Relation.Snapshot<T>> => {
  assertArgument(isEntity(relation), 'relation', 'Must be a reactive ECHO relation');
  return getEntityAtoms(relation).snapshot;
};

/**
 * Create a read-only atom for the label of a reactive ECHO entity.
 * Re-evaluates on entity mutation; only propagates when the label string changes.
 */
export const makeLabelAtom = <T extends Entity.Unknown>(entity: T): Atom.Atom<string | undefined> => {
  assertArgument(isEntity(entity), 'entity', 'Must be a reactive ECHO entity');
  return getEntityAtoms(entity).label;
};

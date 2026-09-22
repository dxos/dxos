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
import { getLabel } from '../Annotation/index.ts';
import { snapshotEquals, snapshotForComparison } from '../common/atom-snapshot.ts';
import { subscribe } from '../common/proxy/reactive.ts';
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
 * Atom family for ECHO objects.
 * Uses object reference as key — same object returns same atom.
 */
const objectFamily = Atom.family(<T extends Obj.Unknown>(obj: T): Atom.Atom<Obj.Snapshot<T>> => {
  return Atom.make<Obj.Snapshot<T>>((get) => {
    const unsubscribe = subscribe(obj, () => {
      // getSnapshot adds SnapshotKindId brand at runtime; cast bridges static types.
      get.setSelf(getSnapshot(obj) as unknown as Obj.Snapshot<T>);
    });

    get.addFinalizer(() => unsubscribe());

    return getSnapshot(obj) as unknown as Obj.Snapshot<T>;
  });
});

/**
 * Atom family for ECHO refs (snapshot version).
 * Keyed by a structurally-equal tuple `[ref, includeDeleted]` so nested families are avoided.
 * Subscribes to target object changes after loading.
 */
const refFamily = Atom.family(
  <T extends Obj.Unknown>([ref, includeDeleted]: readonly [Ref.Ref<T>, boolean]): Atom.Atom<
    Obj.Snapshot<T> | undefined
  > => {
    return Atom.make<Obj.Snapshot<T> | undefined>((get) => {
      let unsubscribeTarget: (() => void) | undefined;

      // getSnapshot adds SnapshotKindId brand at runtime; cast bridges static types.
      const read = (target: T): Obj.Snapshot<T> | undefined =>
        !includeDeleted && isDeleted(target) ? undefined : (getSnapshot(target) as unknown as Obj.Snapshot<T>);

      const setupTargetSubscription = (target: T): Obj.Snapshot<T> | undefined => {
        unsubscribeTarget?.();
        unsubscribeTarget = subscribe(target, () => {
          get.setSelf(read(target));
        });
        // Runs at once when the node was disposed while the target loaded.
        get.addFinalizer(unsubscribeTarget);
        return read(target);
      };

      return loadRefTarget(ref, get, setupTargetSubscription, includeDeleted ? { deleted: 'include' } : undefined);
    });
  },
);

/**
 * Atom family for ECHO object properties, keyed by `[object, key]`.
 */
const propertyFamily = Atom.family(([obj, key]: readonly [Obj.Unknown, PropertyKey]): Atom.Atom<any> => {
  return Atom.make<any>((get) => {
    let previousSnapshot = snapshotForComparison((obj as any)[key]);

    const unsubscribe2 = subscribe(obj, () => {
      const newValue = (obj as any)[key];
      // Content comparison against the last emitted snapshot: identity would be unequal for every
      // array/object, firing on any mutation of `obj` (see `snapshotEquals`).
      if (!snapshotEquals(newValue, previousSnapshot)) {
        previousSnapshot = snapshotForComparison(newValue);
        get.setSelf(previousSnapshot);
      }
    });

    get.addFinalizer(() => unsubscribe2());

    return snapshotForComparison((obj as any)[key]);
  });
});

/**
 * Atom family for ECHO objects — returns the live object, not a snapshot.
 */
const objectWithReactiveFamily = Atom.family(<T extends Obj.Unknown>(obj: T): Atom.Atom<T> => {
  return Atom.make<T>((get) => {
    const unsubscribe = subscribe(obj, () => {
      get.setSelf(obj);
    });

    get.addFinalizer(() => unsubscribe());

    return obj;
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
const refPropertyFamily = Atom.family(([ref, key]: readonly [Ref.Ref<any>, PropertyKey]): Atom.Atom<any> =>
  Atom.make((get) => {
    const target = get(refWithReactiveFamily(ref));
    return target ? get(propertyFamily([target, key])) : undefined;
  }),
);

/**
 * Atom family for any ECHO entity (obj or relation) — returns a snapshot.
 */
const entityFamily = Atom.family(<T extends Entity.Unknown>(entity: T): Atom.Atom<Entity.Snapshot> => {
  return Atom.make<Entity.Snapshot>((get) => {
    const unsubscribe = subscribe(entity, () => {
      // getSnapshot adds SnapshotKindId brand at runtime; cast bridges static types.
      get.setSelf(getSnapshot(entity) as unknown as Entity.Snapshot);
    });

    get.addFinalizer(() => unsubscribe());

    return getSnapshot(entity) as unknown as Entity.Snapshot;
  });
});

/**
 * Atom family for ECHO relations — returns a typed relation snapshot.
 */
const relationFamily = Atom.family(<T extends Relation.Unknown>(relation: T): Atom.Atom<Relation.Snapshot<T>> => {
  return Atom.make<Relation.Snapshot<T>>((get) => {
    const unsubscribe = subscribe(relation, () => {
      // getSnapshot adds SnapshotKindId brand at runtime; cast bridges static types.
      get.setSelf(getSnapshot(relation) as unknown as Relation.Snapshot<T>);
    });

    get.addFinalizer(() => unsubscribe());

    return getSnapshot(relation) as unknown as Relation.Snapshot<T>;
  });
});

/**
 * Create a read-only snapshot atom for a reactive object or ref.
 * Updates automatically when the object is mutated.
 * For refs, subscribes to target object changes after loading.
 */
export const makeAtom: {
  <T extends Obj.Unknown>(obj: T): Atom.Atom<Obj.Snapshot<T>>;
  <T extends Obj.Unknown>(ref: Ref.Ref<T>, options?: Ref.LoadOptions): Atom.Atom<Obj.Snapshot<T> | undefined>;
} = (objOrRef: Obj.Unknown | Ref.Ref<any>, options?: Ref.LoadOptions): Atom.Atom<any> => {
  if (isRef(objOrRef)) {
    return refFamily([objOrRef, options?.deleted === 'include']);
  }

  const obj = objOrRef as Obj.Unknown;
  assertArgument(isEntity(obj), 'obj', 'Object must be a reactive object');
  return objectFamily(obj as any);
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
    return refPropertyFamily([objOrRef as Ref.Ref<any>, key]);
  }

  const obj = objOrRef as Obj.Unknown;
  assertArgument(isEntity(obj), 'obj', 'Object must be a reactive object');
  return propertyFamily([obj, key]);
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
  return objectWithReactiveFamily(obj);
};

/**
 * Create a read-only snapshot atom for any ECHO entity (obj or relation).
 * Updates automatically when the entity is mutated.
 */
export const makeEntity = <T extends Entity.Unknown>(entity: T): Atom.Atom<Entity.Snapshot> => {
  assertArgument(isEntity(entity), 'entity', 'Must be a reactive ECHO entity');
  return entityFamily(entity);
};

/**
 * Create a read-only snapshot atom for a reactive relation.
 * Updates automatically when the relation is mutated.
 */
export const makeRelation = <T extends Relation.Unknown>(relation: T): Atom.Atom<Relation.Snapshot<T>> => {
  assertArgument(isEntity(relation), 'relation', 'Must be a reactive ECHO relation');
  return relationFamily(relation);
};

/**
 * Atom family for an entity's label string.
 * Fires only when the computed label actually changes, not on every entity mutation.
 */
const labelAtomFamily = Atom.family(<T extends Entity.Unknown>(entity: T): Atom.Atom<string | undefined> => {
  return Atom.make<string | undefined>((get) => {
    let previous = getLabel(entity);

    const unsubscribe = subscribe(entity, () => {
      const next = getLabel(entity);
      if (next !== previous) {
        previous = next;
        get.setSelf(next);
      }
    });

    get.addFinalizer(() => unsubscribe());
    return previous;
  });
});

/**
 * Create a read-only atom for the label of a reactive ECHO entity.
 * Re-evaluates on entity mutation; only propagates when the label string changes.
 */
export const makeLabelAtom = <T extends Entity.Unknown>(entity: T): Atom.Atom<string | undefined> => {
  assertArgument(isEntity(entity), 'entity', 'Must be a reactive ECHO entity');
  return labelAtomFamily(entity);
};

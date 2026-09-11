//
// Copyright 2026 DXOS.org
//

import * as Effect from 'effect/Effect';

import { type Database, Filter, Obj, Type } from '@dxos/echo';

import { type IdentitySpec, identityKeys } from './IdentitySpec.ts';

/**
 * Key → object map over every identity key in a space, kept current as objects are created.
 *
 * Replaces the per-call-site caches that made duplicates inevitable: each of them queried the
 * space once and never saw what the rest of the run created. `register` closes that window — an
 * object built but not yet committed is resolvable immediately, so a repeat sender within a run
 * merges instead of forking.
 */
export interface IdentityIndex {
  /** Existing object matching the lookup input (e.g. `{ email }`), via the type's `inputKeys`. */
  lookup<S extends Type.AnyEntity>(type: S, input: unknown): Type.InstanceType<S> | undefined;
  /** Indexes an object under every key it carries. Safe to call repeatedly. */
  register(object: Obj.Unknown): void;
}

/** An empty index over the given specs; seed it with `register`. */
export const makeIdentityIndex = (specs: ReadonlyArray<IdentitySpec<any>>): IdentityIndex => {
  const byTypename = new Map(specs.map((spec) => [Type.getTypename(spec.type), spec]));
  const entries = new Map<string, Obj.Unknown>();

  return {
    lookup: <S extends Type.AnyEntity>(type: S, input: unknown) => {
      const spec = byTypename.get(Type.getTypename(type));
      if (!spec || !Type.isObject(type)) {
        return undefined;
      }
      for (const key of spec.inputKeys(input)) {
        const found = entries.get(scoped(spec, key));
        // The guard narrows the entry to the requested type — keys are typename-scoped, so this
        // only fails if two specs were registered for one typename.
        if (found !== undefined && Obj.instanceOf(type, found)) {
          return found;
        }
      }
      return undefined;
    },

    register: (object) => {
      const spec = byTypename.get(Obj.getTypename(object) ?? '');
      if (!spec) {
        return;
      }
      for (const key of identityKeys(spec, object)) {
        // First writer wins: the oldest object for a key stays canonical, matching `planMerge`'s
        // survivor rule, so a resolver and a merge never disagree about which object is the one.
        const scopedKey = scoped(spec, key);
        if (!entries.has(scopedKey)) {
          entries.set(scopedKey, object);
        }
      }
    },
  };
};

/**
 * A child index that reads through to `parent` but keeps its own registrations.
 *
 * Use it for objects built but not yet committed. Registering those into a shared, long-lived index
 * would make an aborted run poison it: the index would go on claiming an object the space never
 * received, and the sender would never get one. An overlay is discarded with the run.
 */
export const overlayIdentityIndex = (specs: ReadonlyArray<IdentitySpec<any>>, parent: IdentityIndex): IdentityIndex => {
  const own = makeIdentityIndex(specs);
  return {
    lookup: (type, input) => own.lookup(type, input) ?? parent.lookup(type, input),
    register: (object) => own.register(object),
  };
};

/**
 * Indexes everything the space already holds for each spec's type — one query per type rather than
 * one per candidate, which is what keeps a large sync from going quadratic.
 *
 * Safe to re-run on a live index: `register` is first-writer-wins, so this adds what other writers
 * have committed since without displacing anything the caller registered itself.
 */
export const seedIdentityIndex = (
  db: Database.Database,
  specs: ReadonlyArray<IdentitySpec<any>>,
  index: IdentityIndex,
): Effect.Effect<void> =>
  Effect.gen(function* () {
    for (const spec of specs) {
      const existing = yield* Effect.promise(() => db.query(Filter.type(spec.type)).run());
      for (const object of existing) {
        if (Obj.isObject(object)) {
          index.register(object);
        }
      }
    }
  });

/** A new index seeded from the space. */
export const buildIdentityIndex = (
  db: Database.Database,
  specs: ReadonlyArray<IdentitySpec<any>>,
): Effect.Effect<IdentityIndex> =>
  Effect.gen(function* () {
    const index = makeIdentityIndex(specs);
    yield* seedIdentityIndex(db, specs, index);
    return index;
  });

/** Keys are namespaced by typename so two types can share a key form without colliding. */
const scoped = (spec: IdentitySpec<any>, key: string) => `${Type.getTypename(spec.type)}#${key}`;

//
// Copyright 2026 DXOS.org
//

import * as Effect from 'effect/Effect';

import { type Database, Filter, Obj, Type } from '@dxos/echo';

import { type IdentitySpec, identityKeys } from './IdentitySpec';

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
 * Builds the index by querying each spec's type once. Do this once per run and share it — one
 * query per type instead of one per candidate is what keeps a large sync from going quadratic.
 */
export const buildIdentityIndex = (
  db: Database.Database,
  specs: ReadonlyArray<IdentitySpec<any>>,
): Effect.Effect<IdentityIndex> =>
  Effect.gen(function* () {
    const index = makeIdentityIndex(specs);
    for (const spec of specs) {
      const existing = yield* Effect.promise(() => db.query(Filter.type(spec.type)).run());
      for (const object of existing) {
        if (Obj.isObject(object)) {
          index.register(object);
        }
      }
    }

    return index;
  });

/** Keys are namespaced by typename so two types can share a key form without colliding. */
const scoped = (spec: IdentitySpec<any>, key: string) => `${Type.getTypename(spec.type)}#${key}`;

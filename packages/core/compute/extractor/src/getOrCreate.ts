//
// Copyright 2026 DXOS.org
//

import * as Effect from 'effect/Effect';

import { Obj, type Type } from '@dxos/echo';

import { Resolver, resolve } from './Resolver';

export interface GetOrCreateOptions<T> {
  /**
   * Identity input handed to the `Resolver` for the candidate's type (e.g. `{ email }`, `{ domain }`).
   * When omitted, no lookup is performed and the candidate is always treated as new.
   */
  readonly identity?: unknown;
  /**
   * Merges the candidate's fields into an existing match, run inside `Obj.update`. Invoked only
   * when an existing object is found. Callers own the field-level merge so nested/discriminated
   * fields are handled correctly.
   */
  readonly merge?: (target: Obj.Mutable<T>, candidate: T) => void;
}

/**
 * Resolve a well-formed candidate against existing objects via the {@link Resolver}. When a
 * match exists, the candidate's fields are merged into it (returning `{ object, created: false }`);
 * otherwise the candidate is returned as-is (`created: true`).
 *
 * NEVER calls `db.add` — the returned object is uncommitted. The dispatcher persists.
 */
export const getOrCreate = <S extends Type.AnyObj>(
  type: S,
  candidate: Type.InstanceType<S>,
  options: GetOrCreateOptions<Type.InstanceType<S>> = {},
): Effect.Effect<{ object: Type.InstanceType<S>; created: boolean }, never, Resolver> =>
  Effect.gen(function* () {
    if (options.identity === undefined) {
      return { object: candidate, created: true };
    }

    const existing = yield* resolve(type, options.identity);
    if (!existing) {
      return { object: candidate, created: true };
    }

    if (options.merge) {
      Obj.update(existing, (existing) => options.merge!(existing, candidate));
    }

    return { object: existing, created: false };
  });

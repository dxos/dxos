//
// Copyright 2026 DXOS.org
//

import * as Effect from 'effect/Effect';
import * as Layer from 'effect/Layer';

import { Database } from '@dxos/echo';
import { EffectEx } from '@dxos/effect';
import {
  type IdentityIndex,
  Resolver,
  buildIdentityIndex,
  makeIdentityIndex,
  seedIdentityIndex,
} from '@dxos/extractor';
import { type Organization, type Person } from '@dxos/types';

import { identitySpecs } from './identity';

export type HasEmail = { email: string };

/** In-flight or resolved index per database; see {@link getIdentityIndex}. */
const indexes = new WeakMap<Database.Database, Promise<IdentityIndex>>();

/**
 * The space's single identity index, built once per database and shared by every caller.
 *
 * Sharing is the point: each create-vs-merge site used to hold its own snapshot, so two mailboxes
 * syncing at once both missed the other's contacts and both created one. One index means a Person
 * built by either run is immediately visible to the other.
 *
 * `refresh` re-seeds from the space into the same instance — do this at the start of a run so it
 * picks up what other writers (or an earlier run) committed. Registrations are first-writer-wins,
 * so re-seeding never displaces an uncommitted object a caller has already registered.
 */
export const getIdentityIndex = (
  db: Database.Database,
  options: { refresh?: boolean } = {},
): Effect.Effect<IdentityIndex> =>
  Effect.gen(function* () {
    let pending = indexes.get(db);
    if (!pending) {
      // Cache the in-flight build, not just its result: two runs starting together would otherwise
      // both miss, both build, and end up with separate indexes — the split this exists to close.
      pending = EffectEx.runPromise(buildIdentityIndex(db, identitySpecs));
      indexes.set(db, pending);
    }

    const index = yield* Effect.promise(() => pending);
    if (options.refresh) {
      yield* seedIdentityIndex(db, identitySpecs, index);
    }

    return index;
  });

/**
 * Live resolver backed by the space's shared identity index. Identity comes from the
 * {@link IdentitySpec}s (Person by email, Organization by website domain, either by foreign key), so
 * a resolver lookup, an extractor's create-vs-merge decision and the duplicate scan cannot disagree.
 */
export const Live = Layer.effect(
  Resolver,
  Effect.gen(function* () {
    const { db } = yield* Database.Service;
    const index = yield* getIdentityIndex(db, { refresh: true });
    return Resolver.of({
      resolve: (type, input: unknown) => Effect.succeed(index.lookup(type, input)),
    });
  }),
);

/** In-memory resolver over fixed Person/Organization lists, for tests and stories. */
export const Mock = (data: { people?: Person.Person[]; organizations?: Organization.Organization[] } = {}) => {
  const index = makeIdentityIndex(identitySpecs);
  [...(data.people ?? []), ...(data.organizations ?? [])].forEach((object) => index.register(object));
  return Layer.succeed(
    Resolver,
    Resolver.of({
      resolve: (type, input: unknown) => Effect.succeed(index.lookup(type, input)),
    }),
  );
};

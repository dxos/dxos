//
// Copyright 2026 DXOS.org
//

import * as Effect from 'effect/Effect';
import * as Layer from 'effect/Layer';

import { Database, type Obj } from '@dxos/echo';
import { type IdentityIndex, Resolver, buildIdentityIndex, makeIdentityIndex } from '@dxos/extractor';
import { type Organization, type Person } from '@dxos/types';

import { identitySpecs } from './identity';

export type HasEmail = { email: string };

/**
 * Live resolver backed by the space database. Identity comes from the shared {@link IdentitySpec}s
 * (Person by email, Organization by website domain, either by foreign key), so a resolver lookup,
 * an extractor's create-vs-merge decision and the duplicate scan can never disagree.
 *
 * The index is mutable: {@link registerResolved} adds an object built during the run, closing the
 * window where an uncommitted object was invisible and a repeat sender forked a second Person.
 */
export const Live = Layer.effect(
  Resolver,
  Effect.gen(function* () {
    const { db } = yield* Database.Service;
    const index = yield* buildIdentityIndex(db, identitySpecs);
    indexes.set(db, index);

    return Resolver.of({
      resolve: (type, input: unknown) => Effect.succeed(index.lookup(type, input)),
    });
  }),
);

/**
 * Records an object against the index backing the database's live resolver, so a just-built object
 * resolves before it is committed. A no-op when no resolver has been built for that database.
 */
export const registerResolved = (db: Database.Database, object: Obj.Unknown): void => {
  indexes.get(db)?.register(object);
};

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

/** Per-database index, so concurrent work in one process shares one answer rather than one each. */
const indexes = new WeakMap<Database.Database, IdentityIndex>();

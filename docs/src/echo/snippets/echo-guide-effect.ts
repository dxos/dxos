//
// Copyright 2026 DXOS.org
//

import * as Effect from 'effect/Effect';

import { type Client } from '@dxos/client';
import { Database, Filter, Hypergraph, Obj, type Ref } from '@dxos/echo';
import * as EffectEx from '@dxos/effect/EffectEx';
import { type SpaceId } from '@dxos/keys';

import { Organization, Person } from '../../echo-tutorial/schema.ts';

declare const client: Client;
declare const db: Database.Database;
declare const spaceId: SpaceId;
declare const employer: Ref.Ref<Organization>;

// #region service
// Asks for Database.Service; the caller decides which database.
const hire = (name: string) =>
  Effect.gen(function* () {
    const acme = yield* Database.add(Obj.make(Organization, { name: 'Acme' }));
    yield* Database.add(Obj.make(Person, { name }));
    const people = yield* Database.query(Filter.type(Person)).run;
    yield* Database.flush();
    return { acme, people };
  });
// #endregion service

// #region provide
const result = await EffectEx.runPromise(
  hire('Ada').pipe(Effect.provide(Database.layer(db))),
);
// #endregion provide

// #region errors
const employerName = Effect.gen(function* () {
  const organization = yield* Database.load(employer);
  return organization.name;
}).pipe(
  // A missing target fails with a typed error, caught by its tag.
  Effect.catchTag('EntityNotFoundError', () => Effect.succeed('unknown')),
);
// #endregion errors

// #region hypergraph
// Work that finds its own space asks for the Hypergraph, then narrows to one database.
const inSpace = hire('Grace').pipe(
  Effect.provide(Hypergraph.withDatabase(spaceId)),
  Effect.provide(Hypergraph.layer(client.graph)),
  Effect.catchTag('SpaceNotFoundError', () => Effect.succeed(undefined)),
);
// #endregion hypergraph

export { employerName, inSpace, result };

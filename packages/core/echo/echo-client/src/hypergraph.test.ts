//
// Copyright 2025 DXOS.org
//

import * as Effect from 'effect/Effect';
import * as Layer from 'effect/Layer';
import { afterEach, beforeEach, describe, expect, test } from 'vitest';

import { Database, Filter, Hypergraph, Obj, Query, Ref, Scope } from '@dxos/echo';
import { TestSchema } from '@dxos/echo/testing';
import { EffectEx } from '@dxos/effect';
import { EID } from '@dxos/keys';

import { type EchoDatabase } from './proxy-db';
import { EchoTestBuilder } from './testing';

// Confinement of a scoped Hypergraph view to an allowlist of spaces (agent firewall).
// Two databases share one Hypergraph (same peer/client); a `graph.scoped([...])` view must reach
// only the spaces in its allowlist, by construction.
describe('Hypergraph.scoped', () => {
  let builder: EchoTestBuilder;
  let dbA: EchoDatabase;
  let dbB: EchoDatabase;
  let objA: Obj.Any;
  let objB: Obj.Any;

  beforeEach(async () => {
    builder = await new EchoTestBuilder().open();
    const { peer, db } = await builder.createDatabase();
    dbA = db;
    // Second database on the SAME peer → shares the one in-process Hypergraph.
    dbB = await peer.createDatabase();
    expect(dbA.graph).toBe(dbB.graph);

    objA = dbA.add(Obj.make(TestSchema.Expando, { title: 'in A' }));
    objB = dbB.add(Obj.make(TestSchema.Expando, { title: 'in B' }));
    await dbA.flush();
    await dbB.flush();
  });

  afterEach(async () => {
    await builder.close();
  });

  test('getDatabase returns only spaces in the allowlist', () => {
    const graph = dbA.graph;
    const scopedA = graph.scoped([dbA.spaceId]);
    expect(scopedA.getDatabase(dbA.spaceId)).toBeDefined();
    expect(scopedA.getDatabase(dbB.spaceId)).toBeUndefined();

    // Unscoped graph still sees both (non-agent behavior unchanged).
    expect(graph.getDatabase(dbA.spaceId)).toBeDefined();
    expect(graph.getDatabase(dbB.spaceId)).toBeDefined();
  });

  test('query fan-out is confined to the allowlist', async () => {
    const graph = dbA.graph;
    const ids = (objects: readonly Obj.Any[]) => objects.map((object) => object.id);

    // Scoped to A: only A's source participates in the fan-out.
    const scopedA = await graph.scoped([dbA.spaceId]).query(Query.select(Filter.everything())).run();
    expect(ids(scopedA)).toContain(objA.id);
    expect(ids(scopedA)).not.toContain(objB.id);

    // Scoped to [A, B]: both spaces' sources participate.
    const scopedAB = await graph.scoped([dbA.spaceId, dbB.spaceId]).query(Query.select(Filter.everything())).run();
    expect(ids(scopedAB)).toContain(objA.id);
    expect(ids(scopedAB)).toContain(objB.id);
  });

  test('an explicit foreign space scope finds no source under a scoped view', async () => {
    const graph = dbA.graph;
    const fromB = Query.select(Filter.everything()).from(Scope.space({ id: dbB.spaceId }));

    // Scoped to A: there is no source for B, so an explicit B scope returns nothing.
    const denied = await graph.scoped([dbA.spaceId]).query(fromB).run();
    expect(denied).toHaveLength(0);

    // Scoped to [A, B]: B's source is present, so the same query returns B's object.
    const allowed = await graph.scoped([dbA.spaceId, dbB.spaceId]).query(fromB).run();
    expect(allowed.map((object) => object.id)).toContain(objB.id);
  });

  test('synchronous resolution cannot reach a space outside the allowlist', () => {
    const graph = dbA.graph;
    const uriB = EID.make({ spaceId: dbB.spaceId, entityId: objB.id });

    // Scoped to A: B is not in the view, so a B-qualified URI does not resolve.
    const scopedA = graph.scoped([dbA.spaceId]).createRefResolver({ context: { space: dbA.spaceId } });
    expect(scopedA.resolveSync(uriB, true)).toBeUndefined();

    // Scoped to [A, B]: B is in the view, so it resolves.
    const scopedAB = graph.scoped([dbA.spaceId, dbB.spaceId]).createRefResolver({ context: { space: dbA.spaceId } });
    expect(scopedAB.resolveSync(uriB, true)).toBeDefined();

    // Unscoped graph resolves it (today's behavior unchanged).
    const unscoped = graph.createRefResolver({ context: { space: dbA.spaceId } });
    expect(unscoped.resolveSync(uriB, true)).toBeDefined();
  });

  // Layer matching how the app/headless agent sessions install confinement: an unscoped home
  // Database.Service (writes go to A) plus Hypergraph.scopedLayer confining reads to [A]. A function
  // because the databases are assigned per-test in beforeEach.
  const confinedToA = () => Layer.merge(Database.layer(dbA), Hypergraph.scopedLayer([dbA.spaceId]));

  test('Database.query routes through Hypergraph.scopedLayer when provided', async () => {
    const fromB = Query.select(Filter.everything()).from(Scope.space({ id: dbB.spaceId }));

    // No Hypergraph.Service in context (today's behavior): the explicit B scope reaches B.
    const unconfined = await EffectEx.runPromise(Database.query(fromB).run.pipe(Effect.provide(Database.layer(dbA))));
    expect(unconfined.map((object) => object.id)).toContain(objB.id);

    // Confined to A: the same query finds no source for B → empty. The home Database.Service is
    // untouched (writes still go to A); only the read scope is confined.
    const confined = await EffectEx.runPromise(Database.query(fromB).run.pipe(Effect.provide(confinedToA())));
    expect(confined).toHaveLength(0);

    // A's own object is still reachable under the scope.
    const own = await EffectEx.runPromise(
      Database.query(Query.select(Filter.everything())).run.pipe(Effect.provide(confinedToA())),
    );
    expect(own.map((object) => object.id)).toContain(objA.id);
    expect(own.map((object) => object.id)).not.toContain(objB.id);
  });

  test('Database.query fans out across a multi-space allowlist', async () => {
    const ids = (objects: readonly Obj.Any[]) => objects.map((object) => object.id);

    // Service confined to [A, B] (home A): an unscoped query reads across both allowed spaces.
    const confinedToAB = Layer.merge(Database.layer(dbA), Hypergraph.scopedLayer([dbA.spaceId, dbB.spaceId]));
    const both = await EffectEx.runPromise(
      Database.query(Query.select(Filter.everything())).run.pipe(Effect.provide(confinedToAB)),
    );
    expect(ids(both)).toContain(objA.id);
    expect(ids(both)).toContain(objB.id);

    // Confined to [A] only (home A): the same query reads the home space alone — B is not included.
    const homeOnly = await EffectEx.runPromise(
      Database.query(Query.select(Filter.everything())).run.pipe(Effect.provide(confinedToA())),
    );
    expect(ids(homeOnly)).toContain(objA.id);
    expect(ids(homeOnly)).not.toContain(objB.id);
  });

  test('Database.load denies a ref into a space outside the allowlist', async () => {
    // Home ref to the live object (target inlined, so load short-circuits without resolution).
    const refToA = Ref.make(objA);
    // Bare foreign URI handle (as untrusted data would carry): the gate must reject it pre-resolution.
    const refToB = Ref.fromURI(EID.make({ spaceId: dbB.spaceId, entityId: objB.id }));
    const loadId = (ref: typeof refToA) =>
      Database.load(ref).pipe(
        Effect.map((object) => object.id),
        Effect.catchTag('EntityNotFoundError', () => Effect.succeed(undefined)),
      );

    // Confined to A: the home ref loads; the foreign ref is denied (gated before resolution, so a
    // foreign URI is not a working handle).
    expect(await EffectEx.runPromise(loadId(refToA).pipe(Effect.provide(confinedToA())))).toBe(objA.id);
    expect(await EffectEx.runPromise(loadId(refToB).pipe(Effect.provide(confinedToA())))).toBeUndefined();
  });

  test('scoped() is narrow-only — it intersects and never widens', () => {
    const graph = dbA.graph;

    // [A] ∩ [B] = ∅: cannot reach either.
    const empty = graph.scoped([dbA.spaceId]).scoped([dbB.spaceId]);
    expect(empty.getDatabase(dbA.spaceId)).toBeUndefined();
    expect(empty.getDatabase(dbB.spaceId)).toBeUndefined();

    // [A, B] ∩ [A] = [A]: narrowing to a subset works; cannot re-reach B.
    const narrowed = graph.scoped([dbA.spaceId, dbB.spaceId]).scoped([dbA.spaceId]);
    expect(narrowed.getDatabase(dbA.spaceId)).toBeDefined();
    expect(narrowed.getDatabase(dbB.spaceId)).toBeUndefined();
  });
});

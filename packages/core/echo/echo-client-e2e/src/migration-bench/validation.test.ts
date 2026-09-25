//
// Copyright 2026 DXOS.org
//

import * as Schema from 'effect/Schema';
import { afterEach, beforeEach, describe, expect, test } from 'vitest';

import { Context } from '@dxos/context';
import { DXN, Filter, Obj, Type } from '@dxos/echo';
import { EchoTestBuilder, type EchoTestPeer, getObjectCore } from '@dxos/echo-client/testing';
import { TestReplicationNetwork, type TestReplicator } from '@dxos/echo-host/testing';
import { EncodedReference } from '@dxos/echo-protocol';
import { invariant } from '@dxos/invariant';
import { PublicKey } from '@dxos/keys';

import { type TestDatabase, changedProps, diffSince, headsOf, writesSince } from './harness.ts';

//
// E-validation: proves/disproves DESIGN.md §10.7 q5 ("DECIDED 2026-09-25"). Unlike every other
// migration-bench suite, `PersonV1`/`PersonV2` below declare REQUIRED, EXACT-shaped properties —
// the bench's shared `PersonDoc` (harness.ts) is deliberately all-optional so validation never
// gets in the way, which is exactly why this decision was never exercised until now. See
// `.agents/projects/lenses/M0-REPORT.md` design items 1 and 6, and the `Migration.declare`/`Write`
// vocabulary section.
//

/** `@1`'s data shape (not the entity envelope — no `id`/`meta`), reused for whole-write-set validation. */
const PersonV1Shape = Schema.Struct({
  fullName: Schema.String,
});

/** `@2`'s data shape — deliberately strict (non-empty) so an invalid fold is observable. */
const PersonV2Shape = Schema.Struct({
  name: Schema.String.check(Schema.isMinLength(1)),
});

/** `@1`: the pre-migration shape. */
class PersonV1 extends Type.makeObject<PersonV1>(DXN.make('org.dxos.test.migration.bench.validation.Person', '0.1.0'))(
  PersonV1Shape,
) {}

/** `@2`: the post-migration shape. */
class PersonV2 extends Type.makeObject<PersonV2>(DXN.make('org.dxos.test.migration.bench.validation.Person', '0.2.0'))(
  PersonV2Shape,
) {}

/**
 * Prototype for Q4's "retired properties" fallback: same target shape as `PersonV2`, plus the
 * source property re-declared `optional` so ordinary code that still writes it is not rejected.
 * A real implementation would tag this with a `Migration`-owned "retired" annotation instead of a
 * bare `optional` — this is the minimal shape that proves the mechanism, not the proposed API.
 */
class PersonV2WithRetired extends Type.makeObject<PersonV2WithRetired>(
  DXN.make('org.dxos.test.migration.bench.validation.PersonRetired', '0.2.0'),
)(
  Schema.Struct({
    name: Schema.String.check(Schema.isMinLength(1)),
    fullName: Schema.optional(Schema.String),
  }),
) {}

/** Result of a guarded fold: applied, or rejected with the source left untouched (`Write.report`'s shape). */
type FoldReport = { readonly status: 'applied' } | { readonly status: 'rejected'; readonly reason: string };

/**
 * Cross-peer visibility isn't guaranteed the instant `waitUntilHeadsReplicated`/`updateIndexes`
 * resolve, so poll for the replicated object rather than reading the query result once.
 */
const queryPersonV1ById = async (db: TestDatabase, id: string): Promise<PersonV1> => {
  let found: PersonV1 | undefined;
  await expect
    .poll(async () => {
      [found] = await db.query(Filter.id(id)).run();
      return found;
    })
    .toBeDefined();
  invariant(found, 'expected the replicated object to be queryable');
  return found;
};

/**
 * `createPartitionedPair` (harness.ts) registers the SAME types on both peers — not suited to Q5,
 * which needs peer 2 to never even have `@2`'s class registered (a genuinely old client, not just
 * one that has not replicated yet). Reimplements the same transport-level partition/heal choreography
 * with per-peer type lists instead.
 */
const createAsymmetricPartitionedPair = async (
  builder: EchoTestBuilder,
  peer1Types: Type.AnyEntity[],
  peer2Types: Type.AnyEntity[],
): Promise<{
  network: TestReplicationNetwork;
  peer1: EchoTestPeer;
  peer2: EchoTestPeer;
  partition: () => Promise<void>;
  heal: () => Promise<void>;
  syncAll: (db1: TestDatabase, db2: TestDatabase) => Promise<void>;
}> => {
  const network = await new TestReplicationNetwork().open();
  const peer1 = await builder.createPeer({ types: peer1Types });
  const peer2 = await builder.createPeer({ types: peer2Types });

  let replicator1: TestReplicator = await network.createReplicator();
  let replicator2: TestReplicator = await network.createReplicator();
  await peer1.host.addReplicator(Context.default(), replicator1);
  await peer2.host.addReplicator(Context.default(), replicator2);

  const partition = async (): Promise<void> => {
    await peer1.host.removeReplicator(replicator1);
    await peer2.host.removeReplicator(replicator2);
  };

  const heal = async (): Promise<void> => {
    replicator1 = await network.createReplicator();
    replicator2 = await network.createReplicator();
    await peer1.host.addReplicator(Context.default(), replicator1);
    await peer2.host.addReplicator(Context.default(), replicator2);
  };

  const syncAll = async (db1: TestDatabase, db2: TestDatabase): Promise<void> => {
    await db1.waitUntilHeadsReplicated(await db2.getDocumentHeads());
    await db2.waitUntilHeadsReplicated(await db1.getDocumentHeads());
    await db1.updateIndexes();
    await db2.updateIndexes();
  };

  return { network, peer1, peer2, partition, heal, syncAll };
};

describe("E-validation: local-write validation against the object's own type version", () => {
  let builder: EchoTestBuilder;
  let network: TestReplicationNetwork | undefined;

  beforeEach(async () => {
    builder = await new EchoTestBuilder().open();
  });

  afterEach(async () => {
    await builder.close();
    await network?.close();
    network = undefined;
  });

  test('V1: ObjectCore.setType is the only type-switch primitive, and it changes what schema resolves and what Filter.type matches', async ({
    expect,
  }) => {
    await using peer = await builder.createPeer({ types: [PersonV1, PersonV2] });
    await using db = await peer.createDatabase();

    const obj = db.add(Obj.make(PersonV1, { fullName: 'Ada Lovelace' }));
    await db.flush();

    // No `Obj.setType`/`ObjectCore.setType`-adjacent public API exists on `@dxos/echo`'s `Obj`/`Type`
    // namespaces or on `EntityMeta` (searched: `setType`, `SetType` across `packages/core/echo`) —
    // the only occurrences are `ObjectCore.setType` itself (internal, `echo-client/core-db`) and its
    // one call site, `setSchemaPropertiesOnObjectCore`, which only ever runs once, at creation
    // (`echo-handler.ts`). Post-creation, the smallest path is this internal primitive directly.
    const beforeType = Obj.getType(obj);
    invariant(beforeType, 'expected a type reference');
    expect(Type.getVersion(beforeType)).to.eq('0.1.0');
    expect((await db.query(Filter.type(PersonV1)).run()).map((o) => o.id)).to.deep.eq([obj.id]);
    expect(await db.query(Filter.type(PersonV2)).run()).to.deep.eq([]);

    getObjectCore(obj).setType(EncodedReference.fromURI(Type.getURI(PersonV2)));
    await db.flush();

    const afterType = Obj.getType(obj);
    invariant(afterType, 'expected a type reference');
    expect(Type.getVersion(afterType)).to.eq('0.2.0');
    expect(await db.query(Filter.type(PersonV1)).run()).to.deep.eq([]);
    expect((await db.query(Filter.type(PersonV2)).run()).map((o) => o.id)).to.deep.eq([obj.id]);
  });

  test('V2: writing an `@2`-only property while the object is still typed `@1` is rejected', async ({ expect }) => {
    await using peer = await builder.createPeer({ types: [PersonV1, PersonV2] });
    await using db = await peer.createDatabase();

    const obj = db.add(Obj.make(PersonV1, { fullName: 'Ada Lovelace' }));
    await db.flush();

    // `name` is not a property of `@1` — `_validateValue`'s `getPropertySchema` throws before the
    // value schema (`Schema.asserts`) is even consulted. `Obj.setValue` (not a direct field
    // assignment) is used here and throughout this suite so a write to a property absent from the
    // handle's *compile-time* type does not require a cast — it goes through the identical proxy
    // `set` trap either way.
    expect(() => {
      Obj.update(obj, (obj) => {
        Obj.setValue(obj, ['name'], 'Ada');
      });
    }).toThrow(/Unknown property/);

    // The rejected write must not have landed: the object is still exactly its `@1` shape.
    expect(obj.fullName).to.eq('Ada Lovelace');
    expect(Obj.getValue(obj, ['name'])).to.be.undefined;
  });

  test('V3: a helper validates the merged post-migration state as a whole against `@2`, then applies the write set and the type switch in one `Obj.update`', async ({
    expect,
  }) => {
    await using peer = await builder.createPeer({ types: [PersonV1, PersonV2] });
    await using db = await peer.createDatabase();

    const obj = db.add(Obj.make(PersonV1, { fullName: 'Ada Lovelace' }));
    await db.flush();

    // Whole-write-set validation: decode the INTENDED post-migration view against `@2` before
    // touching the object. `decodeUnknownSync`'s default `onExcessProperty: "ignore"` is exactly
    // what makes this tolerate a merged view that still carries `fullName` (Q4) — no "retired
    // properties" declaration is needed for validation to pass, only for a later WRITE to the
    // retired key (see V4c).
    const intended = { name: obj.fullName };
    const decoded = Schema.decodeUnknownSync(PersonV2Shape)(intended);

    Obj.update(obj, (obj) => {
      getObjectCore(obj).setType(EncodedReference.fromURI(Type.getURI(PersonV2)));
      Obj.setValue(obj, ['name'], decoded.name);
    });
    await db.flush();

    const type = Obj.getType(obj);
    invariant(type, 'expected a type reference');
    expect(Type.getVersion(type)).to.eq('0.2.0');
    expect(Obj.getValue(obj, ['name'])).to.eq('Ada Lovelace');
    expect(obj.fullName).to.eq('Ada Lovelace'); // retained (Q4).
    expect((await db.query(Filter.type(PersonV2)).run()).map((o) => o.id)).to.deep.eq([obj.id]);
  });

  describe('V4: retained source properties under `@2`', () => {
    const migrate = (db: TestDatabase, obj: PersonV1): void => {
      const decoded = Schema.decodeUnknownSync(PersonV2Shape)({ name: obj.fullName });
      Obj.update(obj, (obj) => {
        getObjectCore(obj).setType(EncodedReference.fromURI(Type.getURI(PersonV2)));
        Obj.setValue(obj, ['name'], decoded.name);
      });
    };

    test('V4a: reading the retained property and querying by `@2` both work', async ({ expect }) => {
      await using peer = await builder.createPeer({ types: [PersonV1, PersonV2] });
      await using db = await peer.createDatabase();

      const obj = db.add(Obj.make(PersonV1, { fullName: 'Grace Hopper' }));
      await db.flush();
      migrate(db, obj);
      await db.flush();

      expect(Obj.getValue(obj, ['fullName'])).to.eq('Grace Hopper');
      const [queried] = await db.query(Filter.type(PersonV2)).run();
      invariant(queried, 'expected the migrated object to be queryable by @2');
      expect(queried.name).to.eq('Grace Hopper');
      expect(Obj.getValue(queried, ['fullName'])).to.eq('Grace Hopper');
    });

    test('V4b: an ORDINARY later `@2` write to `name` is unaffected by the retained `fullName`', async ({ expect }) => {
      await using peer = await builder.createPeer({ types: [PersonV1, PersonV2] });
      await using db = await peer.createDatabase();

      const obj = db.add(Obj.make(PersonV1, { fullName: 'Grace Hopper' }));
      await db.flush();
      migrate(db, obj);
      await db.flush();

      Obj.update(obj, (obj) => {
        Obj.setValue(obj, ['name'], 'Grace M. Hopper');
      });
      await db.flush();
      expect(Obj.getValue(obj, ['name'])).to.eq('Grace M. Hopper');
      expect(Obj.getValue(obj, ['fullName'])).to.eq('Grace Hopper'); // untouched.
    });

    test('V4c: it DOES choke — a write to the now-retired `fullName` is rejected as "Unknown property"; a schema that re-declares it optional accepts the write', async ({
      expect,
    }) => {
      await using peer = await builder.createPeer({ types: [PersonV1, PersonV2, PersonV2WithRetired] });
      await using db = await peer.createDatabase();

      const obj = db.add(Obj.make(PersonV1, { fullName: 'Grace Hopper' }));
      await db.flush();
      migrate(db, obj);
      await db.flush();

      // Stale application code that still writes the pre-migration field is rejected once the
      // object is `@2` — reads/queries tolerate the retained property (V4a/b); only a WRITE to it
      // chokes. This is the gap DESIGN.md §10.7 q5's "retired properties" declaration is for.
      expect(() => {
        Obj.update(obj, (obj) => {
          Obj.setValue(obj, ['fullName'], 'stale write');
        });
      }).toThrow(/Unknown property/);

      // Prototype fallback: a target schema that re-declares the retired property `optional`
      // accepts the same write. Proven on a fresh object (a real "retired" annotation would apply
      // to `@2` itself, not require a parallel schema — this is the minimal proof of mechanism).
      const tolerant = db.add(Obj.make(PersonV1, { fullName: 'Katherine Johnson' }));
      await db.flush();
      Obj.update(tolerant, (tolerant) => {
        getObjectCore(tolerant).setType(EncodedReference.fromURI(Type.getURI(PersonV2WithRetired)));
        Obj.setValue(tolerant, ['name'], tolerant.fullName);
      });
      await db.flush();
      expect(() => {
        Obj.update(tolerant, (tolerant) => {
          Obj.setValue(tolerant, ['fullName'], 'no longer stale');
        });
      }).not.toThrow();
      expect(Obj.getValue(tolerant, ['fullName'])).to.eq('no longer stale');
    });
  });

  test('V5: a late `@1` write from an unmigrated peer folds into `@2` after heal; an invalid late value is rejected as a `Write.report`, leaving the source untouched and writing nothing', async ({
    expect,
  }) => {
    const [spaceKey] = PublicKey.randomSequence();
    // Peer 2 never registers `@2` at all — a genuinely old client, not merely one that has not yet
    // replicated the type switch (a same-binary peer that HAS replicated it would itself resolve
    // `@2` and reject `fullName`, closing this scenario the instant the two peers first sync).
    const pair = await createAsymmetricPartitionedPair(builder, [PersonV1, PersonV2], [PersonV1]);
    network = pair.network;
    const { peer1, peer2, partition, heal, syncAll } = pair;

    await using db1 = await peer1.createDatabase(spaceKey);
    const obj1 = db1.add(Obj.make(PersonV1, { fullName: 'Ada Lovelace' }));
    await db1.flush();

    const rootUrl = db1.rootUrl;
    invariant(rootUrl, 'root url');
    await using db2 = await peer2.openDatabase(spaceKey, rootUrl);
    await db2.waitUntilHeadsReplicated(await db1.getDocumentHeads());
    await db2.updateIndexes();
    const obj2 = await queryPersonV1ById(db2, obj1.id);

    const preHeads = headsOf(obj1);

    await partition();

    const decoded1 = Schema.decodeUnknownSync(PersonV2Shape)({ name: obj1.fullName });
    Obj.update(obj1, (obj1) => {
      getObjectCore(obj1).setType(EncodedReference.fromURI(Type.getURI(PersonV2)));
      Obj.setValue(obj1, ['name'], decoded1.name);
    });
    await db1.flush();

    // Peer 2 keeps writing the old shape. Its own doc still reads `@1` here (partitioned before
    // the switch replicated) so this validates against `@1` normally — the second round below
    // shows the case that actually needs peer 2 to lack `@2` entirely.
    Obj.update(obj2, (obj2) => {
      obj2.fullName = 'Augusta Ada King';
    });
    await db2.flush();

    await heal();
    await syncAll(db1, db2);
    await expect.poll(() => Obj.getValue(obj1, ['fullName'])).toBe('Augusta Ada King');

    const lateSourceProps = changedProps(diffSince(obj1, preHeads), new Set(['fullName']));
    expect([...lateSourceProps]).to.deep.eq(['fullName']);

    // Guarded validated fold: whole-view decode against `@2` before writing.
    const foldFullNameToName = (): FoldReport => {
      const lateValue = Obj.getValue(obj1, ['fullName']);
      let decoded: { name: string };
      try {
        decoded = Schema.decodeUnknownSync(PersonV2Shape)({ name: lateValue });
      } catch (error) {
        return { status: 'rejected', reason: error instanceof Error ? error.message : String(error) };
      }
      if (Obj.getValue(obj1, ['name']) === decoded.name) {
        return { status: 'applied' }; // already folded — value-compare guard, no write.
      }
      Obj.update(obj1, (obj1) => {
        Obj.setValue(obj1, ['name'], decoded.name);
      });
      return { status: 'applied' };
    };

    const preFoldHeads = headsOf(obj1);
    const report = foldFullNameToName();
    await db1.flush();

    expect(report).to.deep.eq({ status: 'applied' });
    expect(Obj.getValue(obj1, ['name'])).to.eq('Augusta Ada King');

    // Re-run: idempotent, guarded, zero writes.
    const postFoldHeads = headsOf(obj1);
    expect(foldFullNameToName()).to.deep.eq({ status: 'applied' });
    await db1.flush();
    expect(writesSince(obj1, postFoldHeads)).to.deep.eq([]);

    // Second round: peer 2's doc now reads `@2` (replicated in the heal above), but peer 2 never
    // registered `PersonV2` — `_validateValue`'s `getSchema` cannot resolve it, so the write "passes
    // through unvalidated" (echo-handler.ts's own comment on that branch) exactly as it would for a
    // client that genuinely predates the version bump. It writes an EMPTY value — invalid for `@2`'s
    // `isMinLength(1)` — which only peer 1's fold, below, ever checks.
    await partition();
    Obj.update(obj2, (obj2) => {
      obj2.fullName = '';
    });
    await db2.flush();
    await heal();
    await syncAll(db1, db2);
    await expect.poll(() => Obj.getValue(obj1, ['fullName'])).toBe('');

    const preInvalidFoldHeads = headsOf(obj1);
    const invalidReport = foldFullNameToName();
    await db1.flush();

    expect(invalidReport.status).to.eq('rejected');
    invariant(invalidReport.status === 'rejected');
    expect(invalidReport.reason).to.be.a('string').and.not.empty;
    // Rejected: the fold wrote nothing at all (name unchanged, source left as-is).
    expect(Obj.getValue(obj1, ['name'])).to.eq('Augusta Ada King');
    expect(Obj.getValue(obj1, ['fullName'])).to.eq('');
    expect(writesSince(obj1, preInvalidFoldHeads)).to.deep.eq([]);

    // The rejection is not sticky: peer 2 fixing its own late value lets a later fold succeed.
    await partition();
    Obj.update(obj2, (obj2) => {
      obj2.fullName = 'A. A. King';
    });
    await db2.flush();
    await heal();
    await syncAll(db1, db2);
    await expect.poll(() => Obj.getValue(obj1, ['fullName'])).toBe('A. A. King');
    expect(foldFullNameToName()).to.deep.eq({ status: 'applied' });
    await db1.flush();
    expect(Obj.getValue(obj1, ['name'])).to.eq('A. A. King');
  });
});

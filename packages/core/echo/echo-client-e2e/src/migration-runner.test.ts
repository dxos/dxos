//
// Copyright 2026 DXOS.org
//

import * as Schema from 'effect/Schema';
import { afterEach, describe, expect, test } from 'vitest';

import { DXN, Filter, Migration, Obj, Type } from '@dxos/echo';
import { EchoTestBuilder } from '@dxos/echo-client/testing';
import { type TestReplicationNetwork } from '@dxos/echo-host/testing';
import { invariant } from '@dxos/invariant';
import { PublicKey } from '@dxos/keys';

import { type TestDatabase, createPartitionedPair } from './migration-bench/harness.ts';

//
// B1 acceptance: `EchoDatabase#runObjectMigration` writes only the data keys its transform actually
// changed, in one automerge change on the object's own `ObjectCore` — never the whole entity struct.
// A peer's concurrent edit to a property the migration never touches must therefore survive sync,
// where the old whole-struct replace (`EntityManager.atomicReplaceObject`) would have clobbered it.
// See `.agents/projects/lenses/IMPLEMENTATION-PLAN.md` Phase B "B1 — first slice" and
// `.agents/projects/lenses/M0-REPORT.md` design item 1.
//

class ContactV1 extends Type.makeObject<ContactV1>(DXN.make('org.dxos.test.migration.runner.Contact', '0.1.0'))(
  Schema.Struct({
    firstName: Schema.String,
    lastName: Schema.String,
    note: Schema.optional(Schema.String),
  }),
) {}

class ContactV2 extends Type.makeObject<ContactV2>(DXN.make('org.dxos.test.migration.runner.Contact', '0.2.0'))(
  Schema.Struct({
    name: Schema.String,
  }),
) {}

const contactMigration = Migration.define({
  from: ContactV1,
  to: ContactV2,
  transform: async (from) => ({ name: `${from.firstName} ${from.lastName}` }),
});

/**
 * Cross-peer visibility isn't guaranteed the instant `waitUntilHeadsReplicated`/`updateIndexes`
 * resolve, so poll for the replicated object rather than reading the query result once.
 */
const queryContactById = async (db: TestDatabase, id: string): Promise<ContactV1> => {
  let found: ContactV1 | undefined;
  await expect
    .poll(async () => {
      [found] = await db.query(Filter.id(id)).run();
      return found;
    })
    .toBeDefined();
  invariant(found, 'expected the replicated object to be queryable');
  return found;
};

describe('migration runner: concurrent edits survive', () => {
  let builder: EchoTestBuilder;
  let network: TestReplicationNetwork | undefined;

  afterEach(async () => {
    await builder.close();
    await network?.close();
    network = undefined;
  });

  test('a peer editing an untouched property while another peer migrates keeps both edits after sync', async () => {
    builder = await new EchoTestBuilder().open();
    const [spaceKey] = PublicKey.randomSequence();
    const pair = await createPartitionedPair(builder, [ContactV1, ContactV2]);
    network = pair.network;
    const { peer1, peer2, partition, heal, syncAll } = pair;

    await using db1 = await peer1.createDatabase(spaceKey);
    const contact1 = db1.add(Obj.make(ContactV1, { firstName: 'Ada', lastName: 'Lovelace', note: 'original' }));
    await db1.flush();

    const rootUrl = db1.rootUrl;
    invariant(rootUrl, 'root url');
    await using db2 = await peer2.openDatabase(spaceKey, rootUrl);
    await db2.waitUntilHeadsReplicated(await db1.getDocumentHeads());
    await db2.updateIndexes();
    const contact2 = await queryContactById(db2, contact1.id);

    await partition();

    // Peer 1 migrates `firstName`/`lastName` into `name`, never touching `note`. Peer 2, concurrently
    // and unaware of the migration, edits `note` directly through the old schema.
    await db1.runMigrations([contactMigration]);
    Obj.update(contact2, (contact2) => {
      contact2.note = 'edited concurrently';
    });
    await db2.flush();

    await heal();
    await syncAll(db1, db2);

    await expect.poll(() => Obj.getTypename(contact1)).toBe('org.dxos.test.migration.runner.Contact');
    await expect.poll(() => Obj.getValue(contact1, ['note'])).toBe('edited concurrently');
    await expect.poll(() => Obj.getValue(contact1, ['name'])).toBe('Ada Lovelace');

    await expect.poll(() => Obj.getTypename(contact2)).toBe('org.dxos.test.migration.runner.Contact');
    await expect.poll(() => Obj.getValue(contact2, ['note'])).toBe('edited concurrently');
    await expect.poll(() => Obj.getValue(contact2, ['name'])).toBe('Ada Lovelace');
  });
});

//
// Phase D item 1: `ensure`'s effects happen DURING `transform`, before the source object's own
// change lands — a crash in between must be healed by re-running, with `ensure` finding (never
// duplicating) whatever an earlier, interrupted attempt already created.
// See `.agents/projects/lenses/IMPLEMENTATION-PLAN.md` Phase D item 1.
//

class CrashChildDoc extends Type.makeObject<CrashChildDoc>(
  DXN.make('org.dxos.test.migration.runner.crash.Child', '0.1.0'),
)(Schema.Struct({ note: Schema.optional(Schema.String) })) {}

class CrashSourceV1 extends Type.makeObject<CrashSourceV1>(
  DXN.make('org.dxos.test.migration.runner.crash.Source', '0.1.0'),
)(Schema.Struct({ name: Schema.String })) {}

class CrashSourceV2 extends Type.makeObject<CrashSourceV2>(
  DXN.make('org.dxos.test.migration.runner.crash.Source', '0.2.0'),
)(Schema.Struct({ name: Schema.String })) {}

describe('migration runner: ensure is idempotent across a crash between ensure and the source change', () => {
  let builder: EchoTestBuilder;

  afterEach(async () => {
    await builder.close();
  });

  test('re-running after a mid-transform crash converges with exactly one child, never a duplicate', async () => {
    builder = await new EchoTestBuilder().open();
    const peer = await builder.createPeer({ types: [CrashSourceV1, CrashSourceV2, CrashChildDoc] });
    await using db = await peer.createDatabase();

    const source = db.add(Obj.make(CrashSourceV1, { name: 'Ada' }));
    await db.flush();

    // The first attempt: `ensure` commits the child, then the transform throws — standing in for a
    // process crash right after, before `#runObjectMigration` ever writes the source's own change.
    let attempts = 0;
    const crashOnceMigration = Migration.define({
      from: CrashSourceV1,
      to: CrashSourceV2,
      transform: async (from, context) => {
        attempts += 1;
        context.ensure(CrashChildDoc, `crash-resume:${from.id}:child`, { note: 'child note' });
        if (attempts === 1) {
          throw new Error('simulated crash: after ensure, before the source change lands');
        }
        return { name: from.name };
      },
    });

    await expect(db.runMigrations([crashOnceMigration])).rejects.toThrow(/simulated crash/);

    // The source object kept its old type — its own change never landed — but the child `ensure`
    // created before the "crash" is real, committed, and queryable.
    expect(Obj.getTypename(source)).toBe('org.dxos.test.migration.runner.crash.Source');
    expect(Obj.getTypeURI(source)?.toString()).toBe('dxn:org.dxos.test.migration.runner.crash.Source:0.1.0');
    const childrenAfterCrash = await db.query(Filter.type(CrashChildDoc)).run();
    expect(childrenAfterCrash).toHaveLength(1);

    // Re-run: the source is still `fromType`, so the runner re-executes `transform` from scratch.
    // `ensure` finds the SAME child by convergence key rather than minting a second one, and this
    // time the transform completes, landing the source's own change.
    await db.runMigrations([crashOnceMigration]);

    expect(attempts).toBe(2);
    await expect
      .poll(() => Obj.getTypeURI(source)?.toString())
      .toBe('dxn:org.dxos.test.migration.runner.crash.Source:0.2.0');

    const childrenAfterResume = await db.query(Filter.type(CrashChildDoc)).run();
    expect(childrenAfterResume).toHaveLength(1);
    expect(childrenAfterResume[0].id).toBe(childrenAfterCrash[0].id);

    // A third run is a pure no-op: the source no longer matches `fromType`, so the migration does
    // not even re-invoke `transform`.
    await db.runMigrations([crashOnceMigration]);
    expect(attempts).toBe(2);
  });
});

//
// Copyright 2026 DXOS.org
//

import * as Schema from 'effect/Schema';
import { afterEach, beforeEach, describe, expect, test } from 'vitest';

import { waitForCondition } from '@dxos/async';
import { DXN, Filter, Migration, Obj, Ref, Type } from '@dxos/echo';
import { EchoTestBuilder } from '@dxos/echo-client/testing';
import { type TestReplicationNetwork } from '@dxos/echo-host/testing';
import { invariant } from '@dxos/invariant';
import { PublicKey } from '@dxos/keys';

import { type TestDatabase, createPartitionedPair } from './migration-bench/harness.ts';

//
// Phase D item 2 (`.agents/projects/lenses/IMPLEMENTATION-PLAN.md`; M0-REPORT.md design item 4):
// fan-out through the real `Migration.define` + `onMigration`'s `ensure` API, on a single peer and on two
// partitioned peers that migrate independently. `Write.ensure` = create with a random id + a
// migration-namespaced `meta.convergenceKey`; collapse and ref redirects come from the LANDED merge
// engine (#12412), never from this code — this suite proves `ensure` mints exactly the shape the
// engine already knows how to collapse.
//

class FanOutChildDoc extends Type.makeObject<FanOutChildDoc>(DXN.make('org.dxos.test.migration.fanout.Child', '0.1.0'))(
  Schema.Struct({ street: Schema.optional(Schema.String), note: Schema.optional(Schema.String) }),
) {}

class FanOutParentV1 extends Type.makeObject<FanOutParentV1>(
  DXN.make('org.dxos.test.migration.fanout.Parent', '0.1.0'),
)(Schema.Struct({ employerAddress: Schema.String })) {}

class FanOutParentV2 extends Type.makeObject<FanOutParentV2>(
  DXN.make('org.dxos.test.migration.fanout.Parent', '0.2.0'),
)(Schema.Struct({ employerAddress: Schema.String, address: Schema.optional(Ref.Ref(FanOutChildDoc)) })) {}

const FAN_OUT_MIGRATION_ID = 'org.dxos.test.migration.fanout';

/** One child per parent, keyed `<migrationId>:<sourceId>:<role>` as design item 2 documents. */
const fanOutMigration = Migration.define({
  from: FanOutParentV1,
  to: FanOutParentV2,
  transform: (from) => ({ employerAddress: from.employerAddress }),
  onMigration: async ({ before, object, ensure }) => {
    const address = await ensure(FanOutChildDoc, `${FAN_OUT_MIGRATION_ID}:${before.id}:address`, {
      street: before.employerAddress,
    });
    Obj.update(object, (object) => {
      object.address = address;
    });
  },
});

const queryParent = async (db: TestDatabase, id: string): Promise<FanOutParentV1> => {
  let found: FanOutParentV1 | undefined;
  await expect
    .poll(async () => {
      [found] = await db.query(Filter.id(id)).run();
      return found;
    })
    .toBeDefined();
  invariant(found, 'expected the replicated parent to be queryable');
  return found;
};

describe('migration fan-out: single object -> new referenced child, via the real API', () => {
  let builder: EchoTestBuilder;
  let network: TestReplicationNetwork | undefined;

  beforeEach(async () => {
    builder = await new EchoTestBuilder().open();
  });

  afterEach(async () => {
    // Peers must close before the network so replicator teardown runs against a live network.
    await builder.close();
    await network?.close();
    network = undefined;
  });

  test('one peer: ensure creates one child, referenced from the migrated parent; re-run is idempotent', async () => {
    const peer = await builder.createPeer({ types: [FanOutParentV1, FanOutParentV2, FanOutChildDoc] });
    await using db = await peer.createDatabase();

    const parent = db.add(Obj.make(FanOutParentV1, { employerAddress: '221B Baker Street' }));
    await db.flush();

    await db.runMigrations([fanOutMigration]);

    await expect.poll(() => Obj.getTypeURI(parent)?.toString()).toBe('dxn:org.dxos.test.migration.fanout.Parent:0.2.0');
    const children = await db.query(Filter.type(FanOutChildDoc)).run();
    expect(children).toHaveLength(1);
    expect(children[0].street).toBe('221B Baker Street');
    expect(Obj.getMeta(children[0]).convergenceKey).toBe(`${FAN_OUT_MIGRATION_ID}:${parent.id}:address`);

    const addressRef: unknown = Obj.getValue(parent, ['address']);
    invariant(Ref.isRef(addressRef), 'expected the migrated parent to carry a ref');
    const loadedChild = await addressRef.load();
    expect(loadedChild.id).toBe(children[0].id);

    // Re-run: the parent no longer matches `fromType`, so nothing re-executes and no second child appears.
    await db.runMigrations([fanOutMigration]);
    const childrenAfterRerun = await db.query(Filter.type(FanOutChildDoc)).run();
    expect(childrenAfterRerun).toHaveLength(1);
  });

  test('two partitioned peers: independent fan-outs collapse to one child, refs resolve to the survivor, and a loser edit made before healing survives', async ({
    expect,
  }) => {
    const pair = await createPartitionedPair(builder, [FanOutParentV1, FanOutParentV2, FanOutChildDoc]);
    network = pair.network;
    const { peer1, peer2, partition, heal, syncAll } = pair;
    const [spaceKey] = PublicKey.randomSequence();

    const db1 = await peer1.createDatabase(spaceKey);
    const parent1 = db1.add(Obj.make(FanOutParentV1, { employerAddress: '221B Baker Street' }));
    await db1.flush();

    const rootUrl = db1.rootUrl;
    invariant(rootUrl, 'root url');
    const db2 = await peer2.openDatabase(spaceKey, rootUrl);
    await db2.waitUntilHeadsReplicated(await db1.getDocumentHeads());
    await db2.updateIndexes();
    const parent2 = await queryParent(db2, parent1.id);

    await partition();

    // Both peers migrate independently, minting a duplicate under the SAME convergence key.
    await db1.runMigrations([fanOutMigration]);
    await db2.runMigrations([fanOutMigration]);

    // While still partitioned, peer 2 edits ITS OWN (as yet unknown-to-be-a-loser) copy — the
    // unconflicted edit the merge engine's creation-heads replay is meant to recover.
    const childrenOnDb2 = await db2.query(Filter.type(FanOutChildDoc)).run();
    expect(childrenOnDb2).toHaveLength(1);
    Obj.update(childrenOnDb2[0], (child) => {
      child.note = 'gate code 4471';
    });
    await db2.flush();

    await heal();
    await syncAll(db1, db2);

    // Collapses to exactly one live child on both peers.
    await waitForCondition({
      condition: async () => (await db1.query(Filter.type(FanOutChildDoc)).run()).length === 1,
      timeout: 10_000,
    });
    await waitForCondition({
      condition: async () => (await db2.query(Filter.type(FanOutChildDoc)).run()).length === 1,
      timeout: 10_000,
    });

    const [survivorOnDb1] = await db1.query(Filter.type(FanOutChildDoc)).run();
    const [survivorOnDb2] = await db2.query(Filter.type(FanOutChildDoc)).run();
    expect(survivorOnDb1.id).toBe(survivorOnDb2.id);

    // The loser's edit (made before healing, possibly on the losing copy) is recovered onto the
    // survivor — the landed engine's creation-heads replay, exercised end-to-end here.
    await expect.poll(() => survivorOnDb1.note).toBe('gate code 4471');
    expect(survivorOnDb2.note).toBe('gate code 4471');

    // Both parents' refs resolve to the SAME survivor, not whichever copy each peer originally minted.
    const address1: unknown = Obj.getValue(parent1, ['address']);
    const address2: unknown = Obj.getValue(parent2, ['address']);
    invariant(Ref.isRef(address1) && Ref.isRef(address2), 'expected both parents to carry a ref');
    await expect.poll(async () => (await address1.load()).id).toBe(survivorOnDb1.id);
    await expect.poll(async () => (await address2.load()).id).toBe(survivorOnDb1.id);
  });
});

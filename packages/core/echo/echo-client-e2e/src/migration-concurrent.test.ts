//
// Copyright 2026 DXOS.org
//

import * as Schema from 'effect/Schema';
import { describe, expect, test } from 'vitest';

import { waitForCondition } from '@dxos/async';
import { DXN, Filter, Migration, Obj, Ref, Type } from '@dxos/echo';
import { EchoTestBuilder, getObjectCore } from '@dxos/echo-client/testing';
import { invariant } from '@dxos/invariant';
import { PublicKey } from '@dxos/keys';

import { type TestDatabase, createPartitionedPair, headsOf } from './migration-bench/harness.ts';

//
// Two peers running the same multi-object migration while partitioned: the objects each one creates
// carry convergence keys, so after healing both peers hold one set of objects in one state.
//

const ElementStruct = Schema.Struct({ id: Schema.optional(Schema.String), name: Schema.String });

class ChildDoc extends Type.makeObject<ChildDoc>(DXN.make('org.dxos.test.migration.concurrent.Child', '0.1.0'))(
  Schema.Struct({ name: Schema.optional(Schema.String), order: Schema.optional(Schema.Number) }),
) {}

class ListParentV1 extends Type.makeObject<ListParentV1>(
  DXN.make('org.dxos.test.migration.concurrent.ListParent', '0.1.0'),
)(Schema.Struct({ items: Schema.optional(Schema.Array(ElementStruct)) })) {}

class ListParentV2 extends Type.makeObject<ListParentV2>(
  DXN.make('org.dxos.test.migration.concurrent.ListParent', '0.2.0'),
)(
  Schema.Struct({
    items: Schema.optional(Schema.Array(ElementStruct)),
    itemsRefs: Schema.optional(Schema.Record(Schema.String, Ref.Ref(ChildDoc))),
  }),
) {}

const stampMigration = Migration.defineStampElementIds({ type: ListParentV1, property: 'items', elementId: 'id' });

const arrayFanOutMigration = Migration.defineArrayFanOut({
  from: ListParentV1,
  to: ListParentV2,
  property: 'items',
  elementId: 'id',
  child: ChildDoc,
  toChild: (element, index) => ({ name: String(element.name), order: index }),
});

class EmployerDoc extends Type.makeObject<EmployerDoc>(
  DXN.make('org.dxos.test.migration.concurrent.Employer', '0.1.0'),
)(Schema.Struct({ street: Schema.optional(Schema.String) })) {}

class AddressDoc extends Type.makeObject<AddressDoc>(DXN.make('org.dxos.test.migration.concurrent.Address', '0.1.0'))(
  Schema.Struct({ street: Schema.optional(Schema.String), employer: Schema.optional(Ref.Ref(EmployerDoc)) }),
) {}

const fanInMigration = Migration.defineFanIn({
  id: 'org.dxos.test.migration.concurrent.address',
  from: AddressDoc,
  parentOf: (child) => child.employer,
  absorb: (child) => ({ street: child.street }),
  collision: 'parent-wins',
  removal: 'tombstone',
});

const findById = async (db: TestDatabase, id: string): Promise<Obj.Unknown> => {
  let found: Obj.Unknown | undefined;
  await expect
    .poll(async () => {
      [found] = await db.query(Filter.id(id)).run();
      return found;
    })
    .toBeDefined();
  invariant(found, 'expected the replicated object');
  return found;
};

/** Syncs until both peers hold the same heads for `objects`. */
const converge = async (
  syncAll: (db1: TestDatabase, db2: TestDatabase) => Promise<void>,
  db1: TestDatabase,
  db2: TestDatabase,
  objects: readonly [Obj.Unknown, Obj.Unknown][],
): Promise<void> => {
  await expect
    .poll(async () => {
      await syncAll(db1, db2);
      return objects.every(([one, two]) => headsOf(one).join() === headsOf(two).join());
    })
    .toBe(true);
};

describe('migrations run concurrently on two peers', () => {
  test('array fan-out: both peers split one parent into one set of children, and an edit to a losing child survives', async () => {
    const [spaceKey] = PublicKey.randomSequence();
    // Not `await using`: the network must close after the builder.
    const builder = await new EchoTestBuilder().open();
    const pair = await createPartitionedPair(builder, [ListParentV1, ListParentV2, ChildDoc]);
    try {
      const { peer1, peer2, partition, heal, syncAll } = pair;
      await using db1 = await peer1.createDatabase(spaceKey);
      const parent1 = db1.add(Obj.make(ListParentV1, { items: [{ name: 'alpha' }, { name: 'beta' }] }));
      await db1.flush();
      // Stamped on one peer first: concurrent stamping is a separate case, blocked until reconciled.
      await db1.runMigrations([stampMigration]);
      const rootUrl = db1.rootUrl;
      invariant(rootUrl, 'root url');
      await using db2 = await peer2.openDatabase(spaceKey, rootUrl);
      await syncAll(db1, db2);
      const parent2 = await findById(db2, parent1.id);
      invariant(Obj.instanceOf(ListParentV1, parent2));
      await expect.poll(() => (parent2.items ?? []).every((item) => item.id !== undefined)).toBe(true);

      await partition();
      await db1.runMigrations([arrayFanOutMigration]);
      await db2.runMigrations([arrayFanOutMigration]);
      const [beta] = (await db2.query(Filter.type(ChildDoc)).run()).filter((child) => child.name === 'beta');
      invariant(beta, 'expected peer 2 to have split beta');
      Obj.update(beta, (beta) => {
        beta.name = 'beta (edited)';
      });
      await db2.flush();

      await heal();
      for (const db of [db1, db2]) {
        await waitForCondition({
          condition: async () => {
            await syncAll(db1, db2);
            return (await db.query(Filter.type(ChildDoc)).run()).length === 2;
          },
          timeout: 10_000,
        });
      }
      await converge(syncAll, db1, db2, [[parent1, parent2]]);

      const names = async (db: TestDatabase) =>
        (await db.query(Filter.type(ChildDoc)).run()).map((child) => child.name).sort();
      await expect.poll(() => names(db1)).toEqual(['alpha', 'beta (edited)']);
      await expect.poll(() => names(db2)).toEqual(['alpha', 'beta (edited)']);

      // Both parents' refs resolve to the surviving children.
      const survivors = new Set((await db1.query(Filter.type(ChildDoc)).run()).map((child) => child.id));
      for (const parent of [parent1, parent2]) {
        const refs: unknown = Obj.getValue(parent, ['itemsRefs']);
        invariant(typeof refs === 'object' && refs !== null, 'expected the refs record');
        const targets = await Promise.all(
          Object.values(refs).map(async (ref) => (Ref.isRef(ref) ? (await ref.load()).id : undefined)),
        );
        expect(targets.every((id) => id !== undefined && survivors.has(id))).toBe(true);
        expect(targets).toHaveLength(2);
      }
    } finally {
      await builder.close();
      await pair.network.close();
    }
  });

  test('fan-in: both peers absorb the child into the parent, which converges to one value', async () => {
    const [spaceKey] = PublicKey.randomSequence();
    // Not `await using`: the network must close after the builder.
    const builder = await new EchoTestBuilder().open();
    const pair = await createPartitionedPair(builder, [EmployerDoc, AddressDoc]);
    try {
      const { peer1, peer2, partition, heal, syncAll } = pair;
      await using db1 = await peer1.createDatabase(spaceKey);
      const employer1 = db1.add(Obj.make(EmployerDoc, {}));
      const address1 = db1.add(Obj.make(AddressDoc, { street: '221B Baker Street', employer: Ref.make(employer1) }));
      await db1.flush();
      const rootUrl = db1.rootUrl;
      invariant(rootUrl, 'root url');
      await using db2 = await peer2.openDatabase(spaceKey, rootUrl);
      await syncAll(db1, db2);
      const employer2 = await findById(db2, employer1.id);
      const address2 = await findById(db2, address1.id);
      invariant(Obj.instanceOf(EmployerDoc, employer2) && Obj.instanceOf(AddressDoc, address2));

      await partition();
      await db1.runMigrations([fanInMigration]);
      await db2.runMigrations([fanInMigration]);

      await heal();
      await converge(syncAll, db1, db2, [
        [employer1, employer2],
        [address1, address2],
      ]);

      for (const [employer, address] of [
        [employer1, address1],
        [employer2, address2],
      ] as const) {
        expect(employer.street).toBe('221B Baker Street');
        expect(
          Obj.getConflict(employer, 'street')?.alternatives.every(
            (alternative) => alternative.value === '221B Baker Street',
          ) ?? true,
        ).toBe(true);
        expect(getObjectCore(address).isDeleted()).toBe(true);
      }
    } finally {
      await builder.close();
      await pair.network.close();
    }
  });
});

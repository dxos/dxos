//
// Copyright 2026 DXOS.org
//

import { next as A } from '@automerge/automerge';
import * as Schema from 'effect/Schema';
import { describe, expect, test } from 'vitest';

import { DXN, Filter, Migration, Obj, Ref, Type } from '@dxos/echo';
import { EchoTestBuilder, getObjectCore } from '@dxos/echo-client/testing';
import { invariant } from '@dxos/invariant';
import { PublicKey } from '@dxos/keys';
import { getDeep } from '@dxos/util';

import { createPartitionedPair } from './migration-bench/harness.ts';

//
// Array fan-out through the real API: the stable-id precondition, the two-step composition, the
// per-object all-or-nothing gate, raced-stamp reconciliation, and the orphan diagnostic.
//

const ElementStruct = Schema.Struct({ id: Schema.optional(Schema.String), name: Schema.String });

class ArrayFanChildDoc extends Type.makeObject<ArrayFanChildDoc>(
  DXN.make('org.dxos.test.migration.arrayfanout.Child', '0.1.0'),
)(Schema.Struct({ name: Schema.optional(Schema.String) })) {}

class ArrayFanParentV1 extends Type.makeObject<ArrayFanParentV1>(
  DXN.make('org.dxos.test.migration.arrayfanout.Parent', '0.1.0'),
)(Schema.Struct({ items: Schema.optional(Schema.Array(ElementStruct)) })) {}

class ArrayFanParentV2 extends Type.makeObject<ArrayFanParentV2>(
  DXN.make('org.dxos.test.migration.arrayfanout.Parent', '0.2.0'),
)(
  Schema.Struct({
    items: Schema.optional(Schema.Array(ElementStruct)),
    itemsRefs: Schema.optional(Schema.Array(Ref.Ref(ArrayFanChildDoc))),
  }),
) {}

class NoIdElementParentDoc extends Type.makeObject<NoIdElementParentDoc>(
  DXN.make('org.dxos.test.migration.arrayfanout.NoIdParent', '0.1.0'),
)(Schema.Struct({ items: Schema.optional(Schema.Array(Schema.Struct({ name: Schema.String }))) })) {}

const stampMigration = Migration.defineStampElementIds({ type: ArrayFanParentV1, property: 'items', elementId: 'id' });

const toChild = (element: Record<string, unknown>): { name: string } => ({ name: String(element.name) });

const fanOutMigration = Migration.defineArrayFanOut({
  from: ArrayFanParentV1,
  to: ArrayFanParentV2,
  property: 'items',
  elementId: 'id',
  child: ArrayFanChildDoc,
  toChild,
});

describe('migration array fan-out: definition-time checks', () => {
  test('is a definition error when the element schema has no elementId field', () => {
    expect(() =>
      Migration.defineArrayFanOut({
        from: NoIdElementParentDoc,
        to: ArrayFanParentV2,
        property: 'items',
        elementId: 'id',
        child: ArrayFanChildDoc,
        toChild,
      }),
    ).toThrow(/no "id" field/);
  });
});

describe('migration array fan-out: stamping, the split, the gate, and the orphan diagnostic', () => {
  test('stamping is idempotent, then the split creates one child per element and keeps the source array', async () => {
    await using builder = await new EchoTestBuilder().open();
    const peer = await builder.createPeer({ types: [ArrayFanParentV1, ArrayFanParentV2, ArrayFanChildDoc] });
    await using db = await peer.createDatabase();

    const parent = db.add(Obj.make(ArrayFanParentV1, { items: [{ name: 'alpha' }, { name: 'beta' }] }));
    await db.flush();

    await db.runMigrations([stampMigration]);
    expect(parent.items).toHaveLength(2);
    expect((parent.items ?? []).every((item) => item.id !== undefined)).toBe(true);
    const idsAfterFirstStamp = (parent.items ?? []).map((item) => item.id);

    // Presence-guarded: a re-run after reconciliation is a no-op.
    await db.runMigrations([stampMigration]);
    expect((parent.items ?? []).map((item) => item.id)).toEqual(idsAfterFirstStamp);

    await db.runMigrations([fanOutMigration]);

    await expect
      .poll(() => Obj.getTypeURI(parent)?.toString())
      .toBe('dxn:org.dxos.test.migration.arrayfanout.Parent:0.2.0');

    const children = await db.query(Filter.type(ArrayFanChildDoc)).run();
    expect(children).toHaveLength(2);
    expect(children.map((child) => child.name).sort()).toEqual(['alpha', 'beta']);

    // The source array is kept in place, untouched — never replaced with refs.
    const itemsAfter: unknown = Obj.getValue(parent, ['items']);
    invariant(Array.isArray(itemsAfter), 'expected the source array to remain');
    expect(itemsAfter).toHaveLength(2);

    // The new property carries one ref per element.
    const refsAfter: unknown = Obj.getValue(parent, ['itemsRefs']);
    invariant(Array.isArray(refsAfter), 'expected the refs array to exist');
    expect(refsAfter).toHaveLength(2);
    for (const ref of refsAfter) {
      invariant(Ref.isRef(ref), 'expected each entry to be a Ref');
    }
    const loadedChildren = await Promise.all(refsAfter.map((ref) => (Ref.isRef(ref) ? ref.load() : undefined)));
    const loadedNames = loadedChildren.map((child) => (child ? Obj.getValue(child, ['name']) : undefined));
    expect(loadedNames.sort()).toEqual(['alpha', 'beta']);
  });

  test('an element with no stable id yet leaves the whole object alone this pass (all-or-nothing)', async () => {
    await using builder = await new EchoTestBuilder().open();
    const peer = await builder.createPeer({ types: [ArrayFanParentV1, ArrayFanParentV2, ArrayFanChildDoc] });
    await using db = await peer.createDatabase();

    // Deliberately un-stamped.
    const parent = db.add(Obj.make(ArrayFanParentV1, { items: [{ name: 'alpha' }] }));
    await db.flush();

    await db.runMigrations([fanOutMigration]);

    expect(Obj.getTypeURI(parent)?.toString()).toBe('dxn:org.dxos.test.migration.arrayfanout.Parent:0.1.0');
    expect(await db.query(Filter.type(ArrayFanChildDoc)).run()).toHaveLength(0);
  });

  test('raced stamps block the split until a stamping re-run reconciles them', async () => {
    // Peers must close before the network they replicate over.
    const builder = await new EchoTestBuilder().open();
    const pair = await createPartitionedPair(builder, [ArrayFanParentV1, ArrayFanParentV2, ArrayFanChildDoc]);
    try {
      const [spaceKey] = PublicKey.randomSequence();
      await using db1 = await pair.peer1.createDatabase(spaceKey);
      const parent1 = db1.add(Obj.make(ArrayFanParentV1, { items: [{ name: 'alpha' }] }));
      await db1.flush();
      const rootUrl = db1.rootUrl;
      invariant(rootUrl, 'root url');
      await using db2 = await pair.peer2.openDatabase(spaceKey, rootUrl);
      await pair.syncAll(db1, db2);
      let parent2: ArrayFanParentV1 | undefined;
      await expect
        .poll(async () => {
          [parent2] = await db2.query(Filter.id(parent1.id)).run();
          return parent2;
        })
        .toBeDefined();
      invariant(parent2, 'replicated parent');

      // Both peers stamp the same blank element while partitioned: the id register now disagrees.
      await pair.partition();
      await db1.runMigrations([stampMigration]);
      await db2.runMigrations([stampMigration]);
      await pair.heal();
      await pair.syncAll(db1, db2);
      // The gate cannot see a stamp that has not arrived yet; wait until this peer holds both.
      await expect
        .poll(() => {
          const core = getObjectCore(parent1);
          const element: unknown = getDeep(core.getDoc(), [...core.mountPath, 'data', 'items', 0]);
          return typeof element === 'object' && element !== null
            ? Object.keys(A.getConflicts(element, 'id') ?? {}).length
            : 0;
        })
        .toBe(2);

      await db1.runMigrations([fanOutMigration]);
      expect(Obj.getTypeURI(parent1)?.toString()).toBe(fanOutMigration.fromType.toString());
      expect(await db1.query(Filter.type(ArrayFanChildDoc)).run()).toHaveLength(0);

      // A stamping re-run re-asserts the presented id, which clears the disagreement everywhere.
      await db1.runMigrations([stampMigration]);
      await db1.flush();
      await pair.syncAll(db1, db2);
      // Replicated heads can land before this peer's view reflects them; the split is re-runnable.
      await expect
        .poll(async () => {
          await db2.runMigrations([fanOutMigration]);
          return Obj.getTypeURI(parent2 ?? parent1)?.toString();
        })
        .toBe(fanOutMigration.toType.toString());
      expect(await db2.query(Filter.type(ArrayFanChildDoc)).run()).toHaveLength(1);
    } finally {
      await builder.close();
      await pair.network.close();
    }
  });

  test('findOrphanedChildren reports a child whose remembered element id the parent no longer shows', async () => {
    await using builder = await new EchoTestBuilder().open();
    const peer = await builder.createPeer({ types: [ArrayFanParentV1, ArrayFanParentV2, ArrayFanChildDoc] });
    await using db = await peer.createDatabase();

    const parent = db.add(Obj.make(ArrayFanParentV1, { items: [{ name: 'alpha' }] }));
    await db.flush();
    await db.runMigrations([stampMigration]);

    // Model an early split under a raced stamp (M0-REPORT.md design item 5's residual): a live child
    // keyed to an id the array no longer shows, alongside the correct split.
    const prematureElementId = PublicKey.random().toHex();
    const orphan = db.add(Obj.make(ArrayFanChildDoc, { name: 'alpha' }));
    Obj.update(orphan, (orphan) => {
      Obj.getMeta(orphan).convergenceKey = Migration.makeArrayFanOutConvergenceKey(
        fanOutMigration.fromType.toString(),
        parent.id,
        'items',
        prematureElementId,
      );
    });
    await db.flush();

    await db.runMigrations([fanOutMigration]);
    const children = await db.query(Filter.type(ArrayFanChildDoc)).run();
    expect(children).toHaveLength(2); // the orphan, plus the one legitimate split.

    const orphans = await Migration.findOrphanedChildren(db, fanOutMigration);
    expect(orphans.map((candidate) => candidate.id)).toEqual([orphan.id]);
  });
});

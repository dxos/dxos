//
// Copyright 2026 DXOS.org
//

import { next as A } from '@automerge/automerge';
import * as Schema from 'effect/Schema';
import { describe, expect, test } from 'vitest';

import { Context } from '@dxos/context';
import { DXN, Filter, Migration, Obj, Ref, Type } from '@dxos/echo';
import { EchoTestBuilder, type EchoTestPeer, getObjectCore } from '@dxos/echo-client/testing';
import { TestReplicationNetwork, type TestReplicator } from '@dxos/echo-host/testing';
import { invariant } from '@dxos/invariant';
import { PublicKey } from '@dxos/keys';
import { getDeep } from '@dxos/util';

import { createPartitionedPair, headsOf, writesSince } from './migration-bench/harness.ts';

//
// Array fan-out through the real API: the stable-id precondition, the two-step composition, the
// per-object all-or-nothing gate, raced-stamp reconciliation, and the orphan diagnostic.
//

const ElementStruct = Schema.Struct({ id: Schema.optional(Schema.String), name: Schema.String });

class ArrayFanChildDoc extends Type.makeObject<ArrayFanChildDoc>(
  DXN.make('org.dxos.test.migration.arrayfanout.Child', '0.1.0'),
)(Schema.Struct({ name: Schema.optional(Schema.String), order: Schema.optional(Schema.Number) })) {}

class ArrayFanParentV1 extends Type.makeObject<ArrayFanParentV1>(
  DXN.make('org.dxos.test.migration.arrayfanout.Parent', '0.1.0'),
)(Schema.Struct({ items: Schema.optional(Schema.Array(ElementStruct)) })) {}

class ArrayFanParentV2 extends Type.makeObject<ArrayFanParentV2>(
  DXN.make('org.dxos.test.migration.arrayfanout.Parent', '0.2.0'),
)(
  Schema.Struct({
    items: Schema.optional(Schema.Array(ElementStruct)),
    itemsRefs: Schema.optional(Schema.Record(Schema.String, Ref.Ref(ArrayFanChildDoc))),
  }),
) {}

class ArrayFanParentV3 extends Type.makeObject<ArrayFanParentV3>(
  DXN.make('org.dxos.test.migration.arrayfanout.Parent', '0.3.0'),
)(
  Schema.Struct({
    items: Schema.optional(Schema.Array(ElementStruct)),
    itemsRefs: Schema.optional(Schema.Record(Schema.String, Ref.Ref(ArrayFanChildDoc))),
    label: Schema.optional(Schema.String),
  }),
) {}

class NoIdElementParentDoc extends Type.makeObject<NoIdElementParentDoc>(
  DXN.make('org.dxos.test.migration.arrayfanout.NoIdParent', '0.1.0'),
)(Schema.Struct({ items: Schema.optional(Schema.Array(Schema.Struct({ name: Schema.String }))) })) {}

const stampMigration = Migration.defineStampElementIds({ type: ArrayFanParentV1, property: 'items', elementId: 'id' });

const toChild = (element: Record<string, unknown>, index: number): { name: string; order: number } => ({
  name: String(element.name),
  order: index,
});

/** The child refs a split parent holds under `property`, keyed by element id. */
const refsOf = (parent: Obj.Unknown, property: string): Ref.Ref<Obj.Unknown>[] => {
  const refs: unknown = Obj.getValue(parent, [property]);
  return typeof refs === 'object' && refs !== null ? Object.values(refs).filter((ref) => Ref.isRef(ref)) : [];
};

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
    const refsAfter = refsOf(parent, 'itemsRefs');
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

  test('a stamped element beside an unstamped one creates no child before the gate fails', async () => {
    await using builder = await new EchoTestBuilder().open();
    const peer = await builder.createPeer({ types: [ArrayFanParentV1, ArrayFanParentV2, ArrayFanChildDoc] });
    await using db = await peer.createDatabase();

    const parent = db.add(
      Obj.make(ArrayFanParentV1, { items: [{ id: PublicKey.random().toHex(), name: 'alpha' }, { name: 'beta' }] }),
    );
    await db.flush();

    await db.runMigrations([fanOutMigration]);

    expect(Obj.getTypeURI(parent)?.toString()).toBe('dxn:org.dxos.test.migration.arrayfanout.Parent:0.1.0');
    expect(await db.query(Filter.type(ArrayFanChildDoc)).run()).toHaveLength(0);
  });

  test('is a definition error when the refs property is not a record keyed by element id', () => {
    class ArrayRefsParentDoc extends Type.makeObject<ArrayRefsParentDoc>(
      DXN.make('org.dxos.test.migration.arrayfanout.ArrayRefsParent', '0.2.0'),
    )(
      Schema.Struct({
        items: Schema.optional(Schema.Array(ElementStruct)),
        itemsRefs: Schema.optional(Schema.Array(Ref.Ref(ArrayFanChildDoc))),
      }),
    ) {}
    expect(() =>
      Migration.defineArrayFanOut({
        from: ArrayFanParentV1,
        to: ArrayRefsParentDoc,
        property: 'items',
        elementId: 'id',
        child: ArrayFanChildDoc,
        toChild,
      }),
    ).toThrow(/must be a record/);
  });

  test('elements that share an id leave the object unsplit', async () => {
    await using builder = await new EchoTestBuilder().open();
    const peer = await builder.createPeer({ types: [ArrayFanParentV1, ArrayFanParentV2, ArrayFanChildDoc] });
    await using db = await peer.createDatabase();

    const parent = db.add(
      Obj.make(ArrayFanParentV1, {
        items: [
          { id: 'shared', name: 'alpha' },
          { id: 'shared', name: 'beta' },
        ],
      }),
    );
    await db.flush();
    await db.runMigrations([fanOutMigration]);

    expect(Obj.getTypeURI(parent)?.toString()).toBe(fanOutMigration.fromType.toString());
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

//
// Fold-forward for array fan-out (`.agents/projects/lenses/IMPLEMENTATION-PLAN.md` "Limit fixes" item
// 4): an old client can keep editing the kept source array after the split — a field on an existing
// element, a new id'd element, a new id-less element, or a removal — and none of it used to reach the
// fanned-out children. `stampMigrationV2` is the id-stamping migration's `to`-typed twin: the chosen
// fix for "the stamping migration currently queries the `from` type" (M0-REPORT.md design item 5's
// residual) is to run stamping against BOTH `from` and `to` — `runStampElementIdsMigration` already
// takes any `Type.AnyObj`, so a parent already split by the time an old client adds an id-less element
// still gets it stamped, with no runner change needed.
//

const stampMigrationV2 = Migration.defineStampElementIds({
  type: ArrayFanParentV2,
  property: 'items',
  elementId: 'id',
});

/** Splits a freshly created single-element parent and returns it (now `ArrayFanParentV2`) plus its one child. */
const splitSingleElementParent = async (
  db: Awaited<ReturnType<EchoTestPeer['createDatabase']>>,
  name: string,
): Promise<{ parent: ArrayFanParentV1; child: ArrayFanChildDoc }> => {
  const parent = db.add(Obj.make(ArrayFanParentV1, { items: [{ name }] }));
  await db.flush();
  await db.runMigrations([stampMigration]);
  await db.runMigrations([fanOutMigration]);
  await expect.poll(() => Obj.getTypeURI(parent)?.toString()).toBe(fanOutMigration.toType.toString());
  const [child] = await db.query(Filter.type(ArrayFanChildDoc)).run();
  invariant(child, 'expected the split to have created exactly one child');
  return { parent, child };
};

describe('migration array fan-out: fold-forward for late writes to the kept source array', () => {
  test('(a) a late edit to an existing element folds into its child; re-run is a no-op', async () => {
    await using builder = await new EchoTestBuilder().open();
    const peer = await builder.createPeer({ types: [ArrayFanParentV1, ArrayFanParentV2, ArrayFanChildDoc] });
    await using db = await peer.createDatabase();

    const { parent, child } = await splitSingleElementParent(db, 'alpha');
    expect(child.name).toBe('alpha');

    // An old client, still holding the retired source array, edits the element's field.
    Obj.update(parent, (parent) => {
      const items = Obj.getValue(parent, ['items']);
      invariant(Array.isArray(items), 'expected the source array to remain');
      items[0].name = 'alpha-renamed';
    });
    await db.flush();

    // Not yet folded: the late write landed on the retired source array, the child is untouched.
    expect(child.name).toBe('alpha');

    await db.foldForward([fanOutMigration]);
    expect(child.name).toBe('alpha-renamed');

    // Idempotent: a re-run with nothing new writes nothing further.
    const preSecondPassHeads = headsOf(child);
    await db.foldForward([fanOutMigration]);
    expect(writesSince(child, preSecondPassHeads)).to.deep.eq([]);
  });

  test('a late element edit made after the pass read its checkpoint heads is folded by the next pass', async () => {
    await using builder = await new EchoTestBuilder().open();
    const peer = await builder.createPeer({ types: [ArrayFanParentV1, ArrayFanParentV2, ArrayFanChildDoc] });
    await using db = await peer.createDatabase();

    const { parent, child } = await splitSingleElementParent(db, 'alpha');
    const renameElement = (name: string) =>
      Obj.update(parent, (parent) => {
        const items = Obj.getValue(parent, ['items']);
        invariant(Array.isArray(items), 'expected the source array to remain');
        items[0].name = name;
      });

    let duringToChild: (() => void) | undefined;
    const hookedMigration = Migration.defineArrayFanOut({
      from: ArrayFanParentV1,
      to: ArrayFanParentV2,
      property: 'items',
      elementId: 'id',
      child: ArrayFanChildDoc,
      toChild: (element, index) => {
        const result = toChild(element, index);
        duringToChild?.();
        return result;
      },
    });

    renameElement('alpha-renamed');
    await db.flush();
    duringToChild = () => {
      duringToChild = undefined;
      renameElement('alpha-again');
    };
    await db.foldForward([hookedMigration]);
    expect(child.name).toBe('alpha-renamed');

    await db.foldForward([hookedMigration]);
    expect(child.name).toBe('alpha-again');
  });

  test('a reorder folds only each child order, leaving a direct edit to another child key alone', async () => {
    await using builder = await new EchoTestBuilder().open();
    const peer = await builder.createPeer({ types: [ArrayFanParentV1, ArrayFanParentV2, ArrayFanChildDoc] });
    await using db = await peer.createDatabase();

    const parent = db.add(Obj.make(ArrayFanParentV1, { items: [{ name: 'alpha' }, { name: 'beta' }] }));
    await db.flush();
    await db.runMigrations([stampMigration]);
    await db.runMigrations([fanOutMigration]);
    const children = await db.query(Filter.type(ArrayFanChildDoc)).run();
    const alpha = children.find((child) => child.name === 'alpha');
    const beta = children.find((child) => child.name === 'beta');
    invariant(alpha && beta, 'expected both children');
    expect([alpha.order, beta.order]).toEqual([0, 1]);

    Obj.update(alpha, (alpha) => {
      alpha.name = 'Alpha!';
    });
    // An old client moves beta to the front.
    Obj.update(parent, (parent) => {
      const items = Obj.getValue(parent, ['items']);
      invariant(Array.isArray(items), 'expected the source array to remain');
      const [first, second] = items.map((item) => ({ ...item }));
      items.splice(0, 2, second, first);
    });
    await db.flush();
    await db.foldForward([fanOutMigration]);

    expect([alpha.order, beta.order]).toEqual([1, 0]);
    expect(alpha.name).toBe('Alpha!');
    expect(Obj.getConflict(alpha, 'name')).toBeUndefined();
  });

  test('a split parent that a later migration moved on still folds late array edits', async () => {
    await using builder = await new EchoTestBuilder().open();
    const peer = await builder.createPeer({
      types: [ArrayFanParentV1, ArrayFanParentV2, ArrayFanParentV3, ArrayFanChildDoc],
    });
    await using db = await peer.createDatabase();

    const { parent, child } = await splitSingleElementParent(db, 'alpha');
    const laterMigration = Migration.define({
      from: ArrayFanParentV2,
      to: ArrayFanParentV3,
      transform: (from) => ({ items: from.items, itemsRefs: from.itemsRefs, label: 'v3' }),
    });
    await db.runMigrations([laterMigration]);
    expect(Obj.getTypeURI(parent)?.toString()).toBe(laterMigration.toType.toString());

    Obj.update(parent, (parent) => {
      const items = Obj.getValue(parent, ['items']);
      invariant(Array.isArray(items), 'expected the source array to remain');
      items[0].name = 'alpha-late';
    });
    await db.flush();
    await db.foldForward([fanOutMigration, laterMigration]);

    expect(child.name).toBe('alpha-late');
  });

  test('a child deleted in the new shape is not recreated by a late element edit', async () => {
    await using builder = await new EchoTestBuilder().open();
    const peer = await builder.createPeer({ types: [ArrayFanParentV1, ArrayFanParentV2, ArrayFanChildDoc] });
    await using db = await peer.createDatabase();

    const { parent, child } = await splitSingleElementParent(db, 'alpha');
    db.remove(child);
    await db.flush();

    Obj.update(parent, (parent) => {
      const items = Obj.getValue(parent, ['items']);
      invariant(Array.isArray(items), 'expected the source array to remain');
      items[0].name = 'alpha-late';
    });
    await db.flush();
    await db.foldForward([fanOutMigration]);

    expect(await db.query(Filter.type(ArrayFanChildDoc)).run()).toHaveLength(0);
  });

  test('an element whose id stamps disagree is not folded into a child', async () => {
    await using builder = await new EchoTestBuilder().open();
    const peer = await builder.createPeer({ types: [ArrayFanParentV1, ArrayFanParentV2, ArrayFanChildDoc] });
    await using db = await peer.createDatabase();

    const { parent } = await splitSingleElementParent(db, 'alpha');
    Obj.update(parent, (parent) => {
      const items = Obj.getValue(parent, ['items']);
      invariant(Array.isArray(items), 'expected the source array to remain');
      items.push({ name: 'beta' });
    });
    await db.flush();
    // Two stamps written concurrently leave the new element's id register in conflict.
    const core = getObjectCore(parent);
    const unstamped = headsOf(parent);
    core.setDecoded(['data', 'items', 1, 'id'], 'stamp-one');
    core.changeAt(unstamped, (doc) => {
      const element = getDeep<Record<string, unknown>>(doc, [...core.mountPath, 'data', 'items', 1]);
      invariant(element, 'expected the new element');
      element.id = 'stamp-two';
    });
    await db.flush();
    await db.foldForward([fanOutMigration]);

    expect(await db.query(Filter.type(ArrayFanChildDoc)).run()).toHaveLength(1);
  });

  test('(b) a concurrent direct edit to the child conflicts with a late element edit; the direct edit is presented', async () => {
    await using builder = await new EchoTestBuilder().open();
    const peer = await builder.createPeer({ types: [ArrayFanParentV1, ArrayFanParentV2, ArrayFanChildDoc] });
    await using db = await peer.createDatabase();

    const { parent, child } = await splitSingleElementParent(db, 'alpha');

    // A direct edit on the child, concurrent (in CRDT terms — the fold re-forks from the child's
    // creation heads) with an old client's late write to the retired source array.
    Obj.update(child, (child) => {
      child.name = 'Directly Renamed';
    });
    await db.flush();

    Obj.update(parent, (parent) => {
      const items = Obj.getValue(parent, ['items']);
      invariant(Array.isArray(items), 'expected the source array to remain');
      items[0].name = 'alpha-edited';
    });
    await db.flush();

    await db.foldForward([fanOutMigration]);

    const conflict = Obj.getConflict(child, 'name');
    invariant(conflict, 'expected a real conflict between the direct edit and the fold');
    expect(conflict.presented).toBe('Directly Renamed');
    const fold = conflict.alternatives.find((alternative) => alternative.fold);
    invariant(fold, 'expected the folded value among the alternatives');
    expect(fold.value).toBe('alpha-edited');
  });

  test('(c) a late element WITH a stable id ensures a new child and appends its ref', async () => {
    await using builder = await new EchoTestBuilder().open();
    const peer = await builder.createPeer({ types: [ArrayFanParentV1, ArrayFanParentV2, ArrayFanChildDoc] });
    await using db = await peer.createDatabase();

    const { parent } = await splitSingleElementParent(db, 'alpha');

    // An old client, still holding the retired source array, adds a NEW element and stamps it itself
    // (a client old enough to know the id-stamping shape but not the split).
    const newElementId = PublicKey.random().toHex();
    Obj.update(parent, (parent) => {
      const items = Obj.getValue(parent, ['items']);
      invariant(Array.isArray(items), 'expected the source array to remain');
      items.push({ id: newElementId, name: 'beta' });
    });
    await db.flush();

    await db.foldForward([fanOutMigration]);

    const children = await db.query(Filter.type(ArrayFanChildDoc)).run();
    expect(children.map((candidate) => candidate.name).sort()).toEqual(['alpha', 'beta']);

    const refsAfter = refsOf(parent, 'itemsRefs');
    expect(refsAfter).toHaveLength(2);
    const refsById: unknown = Obj.getValue(parent, ['itemsRefs']);
    expect(
      Ref.isRef(typeof refsById === 'object' && refsById !== null ? Reflect.get(refsById, newElementId) : undefined),
    ).toBe(true);
    const loaded = await Promise.all(refsAfter.map((ref) => (Ref.isRef(ref) ? ref.load() : undefined)));
    expect(loaded.map((candidate) => (candidate ? Obj.getValue(candidate, ['name']) : undefined)).sort()).toEqual([
      'alpha',
      'beta',
    ]);

    // Idempotent: a re-run appends nothing further.
    const preSecondPassHeads = headsOf(parent);
    await db.foldForward([fanOutMigration]);
    expect(writesSince(parent, preSecondPassHeads)).to.deep.eq([]);
  });

  test('(d) a late element WITHOUT an id is skipped, stamped by the next runMigrations, then folded on the next pass', async () => {
    await using builder = await new EchoTestBuilder().open();
    const peer = await builder.createPeer({ types: [ArrayFanParentV1, ArrayFanParentV2, ArrayFanChildDoc] });
    await using db = await peer.createDatabase();

    const { parent } = await splitSingleElementParent(db, 'alpha');

    // An old client that never learned to stamp an id at all adds a bare element.
    Obj.update(parent, (parent) => {
      const items = Obj.getValue(parent, ['items']);
      invariant(Array.isArray(items), 'expected the source array to remain');
      items.push({ name: 'gamma' });
    });
    await db.flush();

    await db.foldForward([fanOutMigration]);
    // Skipped this pass: no id yet, so no child and no ref for it.
    expect(await db.query(Filter.type(ArrayFanChildDoc)).run()).toHaveLength(1);
    const refsBeforeStamp = refsOf(parent, 'itemsRefs');
    expect(refsBeforeStamp).toHaveLength(1);

    // The next stamping pass (run against the `to` type — the parent is already split) gives it an id.
    await db.runMigrations([stampMigrationV2]);
    const itemsAfterStamp: unknown = Obj.getValue(parent, ['items']);
    invariant(Array.isArray(itemsAfterStamp), 'expected the source array to remain');
    expect(itemsAfterStamp.at(-1)?.id).toBeTypeOf('string');

    // The following fold-forward pass (against the array-fan-out migration this time) picks it up.
    await db.foldForward([fanOutMigration]);
    const children = await db.query(Filter.type(ArrayFanChildDoc)).run();
    expect(children.map((candidate) => candidate.name).sort()).toEqual(['alpha', 'gamma']);
    const refsAfter = refsOf(parent, 'itemsRefs');
    expect(refsAfter).toHaveLength(2);
  });

  test('(e) a removed element leaves its child alone; findOrphanedChildren still reports it', async () => {
    await using builder = await new EchoTestBuilder().open();
    const peer = await builder.createPeer({ types: [ArrayFanParentV1, ArrayFanParentV2, ArrayFanChildDoc] });
    await using db = await peer.createDatabase();

    const { parent, child } = await splitSingleElementParent(db, 'alpha');

    Obj.update(parent, (parent) => {
      const items = Obj.getValue(parent, ['items']);
      invariant(Array.isArray(items), 'expected the source array to remain');
      items.splice(0, 1);
    });
    await db.flush();

    await db.foldForward([fanOutMigration]);

    // Never deleted -- data stays readable.
    expect(getObjectCore(child).isDeleted()).toBe(false);
    expect(child.name).toBe('alpha');

    const orphans = await Migration.findOrphanedChildren(db, fanOutMigration);
    expect(orphans.map((candidate) => candidate.id)).toEqual([child.id]);
  });
});

/**
 * Mirrors `fold-forward.test.ts`'s own `createAsymmetricPartitionedPair`: peer B registers only
 * `ArrayFanParentV1` — a genuinely old client that never learns the split's target or child types
 * exist, not merely one that has not yet replicated the type switch.
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
  syncAll: (
    db1: Awaited<ReturnType<EchoTestPeer['createDatabase']>>,
    db2: Awaited<ReturnType<EchoTestPeer['createDatabase']>>,
  ) => Promise<void>;
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

  const syncAll = async (
    db1: Awaited<ReturnType<EchoTestPeer['createDatabase']>>,
    db2: Awaited<ReturnType<EchoTestPeer['createDatabase']>>,
  ): Promise<void> => {
    await db1.waitUntilHeadsReplicated(await db2.getDocumentHeads());
    await db2.waitUntilHeadsReplicated(await db1.getDocumentHeads());
    await db1.updateIndexes();
    await db2.updateIndexes();
  };

  return { network, peer1, peer2, partition, heal, syncAll };
};

//
// Per-property markers (coordinator follow-up to "Limit fixes" item 4): a parent that fans out TWO
// array properties must keep one marker per property, never one clobbering the other. The second
// fan-out shares its `from`/`to` with its OWN target type rather than the first's `to` — array-fan-out's
// runner performs the type switch itself and skips any object whose LIVE type no longer matches
// `fromType` (`runArrayFanOutMigration`'s own crash-resume guard), so two migrations racing to switch
// the SAME `from` -> `to` pair would only ever let the first one through; `from === to` for the second
// fan-out is the shape that lets a parent's schema evolve in two separate steps without a version bump
// in between.
//

class TwoPropParentV1 extends Type.makeObject<TwoPropParentV1>(
  DXN.make('org.dxos.test.migration.arrayfanout.twoprop.Parent', '0.1.0'),
)(
  Schema.Struct({
    items: Schema.optional(Schema.Array(ElementStruct)),
    tags: Schema.optional(Schema.Array(ElementStruct)),
  }),
) {}

class TwoPropParentV2 extends Type.makeObject<TwoPropParentV2>(
  DXN.make('org.dxos.test.migration.arrayfanout.twoprop.Parent', '0.2.0'),
)(
  Schema.Struct({
    items: Schema.optional(Schema.Array(ElementStruct)),
    tags: Schema.optional(Schema.Array(ElementStruct)),
    itemsRefs: Schema.optional(Schema.Record(Schema.String, Ref.Ref(ArrayFanChildDoc))),
    tagsRefs: Schema.optional(Schema.Record(Schema.String, Ref.Ref(ArrayFanChildDoc))),
  }),
) {}

const stampTwoPropItems = Migration.defineStampElementIds({
  type: TwoPropParentV1,
  property: 'items',
  elementId: 'id',
});
const stampTwoPropTags = Migration.defineStampElementIds({ type: TwoPropParentV1, property: 'tags', elementId: 'id' });

const itemsFanOutTwoProp = Migration.defineArrayFanOut({
  from: TwoPropParentV1,
  to: TwoPropParentV2,
  property: 'items',
  elementId: 'id',
  child: ArrayFanChildDoc,
  toChild,
});

/** `from === to`: `items` already bumped the parent to V2; `tags` splits later, at the SAME version. */
const tagsFanOutTwoProp = Migration.defineArrayFanOut({
  from: TwoPropParentV2,
  to: TwoPropParentV2,
  property: 'tags',
  elementId: 'id',
  child: ArrayFanChildDoc,
  toChild,
  toProperty: 'tagsRefs',
});

describe('migration array fan-out: per-property markers', () => {
  test('re-running a same-version fan-out does not re-split and skip a late edit', async () => {
    await using builder = await new EchoTestBuilder().open();
    const peer = await builder.createPeer({ types: [TwoPropParentV1, TwoPropParentV2, ArrayFanChildDoc] });
    await using db = await peer.createDatabase();

    const parent = db.add(Obj.make(TwoPropParentV1, { items: [{ name: 'alpha' }], tags: [{ name: 'red' }] }));
    await db.flush();
    await db.runMigrations([stampTwoPropItems, stampTwoPropTags]);
    await db.runMigrations([itemsFanOutTwoProp, tagsFanOutTwoProp]);

    Obj.update(parent, (parent) => {
      const tags = Obj.getValue(parent, ['tags']);
      invariant(Array.isArray(tags), 'expected the source array to remain');
      tags[0].name = 'red-late';
    });
    await db.flush();
    await db.runMigrations([itemsFanOutTwoProp, tagsFanOutTwoProp]);

    const names = (await db.query(Filter.type(ArrayFanChildDoc)).run()).map((child) => child.name).sort();
    expect(names).toEqual(['alpha', 'red-late']);
  });

  test('a parent with two array properties, each split by its own migration, folds late edits on both', async () => {
    await using builder = await new EchoTestBuilder().open();
    const peer = await builder.createPeer({ types: [TwoPropParentV1, TwoPropParentV2, ArrayFanChildDoc] });
    await using db = await peer.createDatabase();

    const parent = db.add(Obj.make(TwoPropParentV1, { items: [{ name: 'alpha' }], tags: [{ name: 'red' }] }));
    await db.flush();

    await db.runMigrations([stampTwoPropItems, stampTwoPropTags]);
    await db.runMigrations([itemsFanOutTwoProp, tagsFanOutTwoProp]);

    await expect.poll(() => Obj.getTypeURI(parent)?.toString()).toBe(itemsFanOutTwoProp.toType.toString());

    const childrenAfterSplit = await db.query(Filter.type(ArrayFanChildDoc)).run();
    expect(childrenAfterSplit.map((candidate) => candidate.name).sort()).toEqual(['alpha', 'red']);

    const itemsRefsAfterSplit = refsOf(parent, 'itemsRefs');
    const tagsRefsAfterSplit = refsOf(parent, 'tagsRefs');
    expect(itemsRefsAfterSplit).toHaveLength(1);
    expect(tagsRefsAfterSplit).toHaveLength(1);

    // An old client, still holding both retired source arrays, edits an element of EACH.
    Obj.update(parent, (parent) => {
      const items = Obj.getValue(parent, ['items']);
      const tags = Obj.getValue(parent, ['tags']);
      invariant(Array.isArray(items) && Array.isArray(tags), 'expected both source arrays to remain');
      items[0].name = 'alpha-edited';
      tags[0].name = 'red-edited';
    });
    await db.flush();

    await db.foldForward([itemsFanOutTwoProp, tagsFanOutTwoProp]);

    const childrenAfterFold = await db.query(Filter.type(ArrayFanChildDoc)).run();
    expect(childrenAfterFold.map((candidate) => candidate.name).sort()).toEqual(['alpha-edited', 'red-edited']);

    // Idempotent: a re-run with nothing new writes nothing further to either marker.
    const preSecondPassHeads = headsOf(parent);
    await db.foldForward([itemsFanOutTwoProp, tagsFanOutTwoProp]);
    expect(writesSince(parent, preSecondPassHeads)).to.deep.eq([]);
  });
});

describe('migration array fan-out: fold-forward across a real partition, peer B a genuinely old client', () => {
  test('(f) peer B never learns of the split; its late edit to the shared element folds into the child on peer A after heal', async () => {
    await using builder = await new EchoTestBuilder().open();
    const pair = await createAsymmetricPartitionedPair(
      builder,
      [ArrayFanParentV1, ArrayFanParentV2, ArrayFanChildDoc],
      [ArrayFanParentV1],
    );
    const { peer1, peer2, partition, heal, syncAll } = pair;
    try {
      const [spaceKey] = PublicKey.randomSequence();
      await using db1 = await peer1.createDatabase(spaceKey);
      const parent1 = db1.add(Obj.make(ArrayFanParentV1, { items: [{ name: 'alpha' }] }));
      await db1.flush();

      const rootUrl = db1.rootUrl;
      invariant(rootUrl, 'root url');
      await using db2 = await peer2.openDatabase(spaceKey, rootUrl);
      await db2.waitUntilHeadsReplicated(await db1.getDocumentHeads());
      await db2.updateIndexes();
      let parent2: ArrayFanParentV1 | undefined;
      await expect
        .poll(async () => {
          [parent2] = await db2.query(Filter.id(parent1.id)).run();
          return parent2;
        })
        .toBeDefined();
      invariant(parent2, 'replicated parent');

      // Stamp and split while still connected, so both peers agree on the element's id.
      await db1.runMigrations([stampMigration]);
      await syncAll(db1, db2);
      await db1.runMigrations([fanOutMigration]);
      await expect.poll(() => Obj.getTypeURI(parent1)?.toString()).toBe(fanOutMigration.toType.toString());

      await partition();

      // Peer B, unaware the split (or even `ArrayFanParentV2`/`ArrayFanChildDoc`) exists, keeps
      // editing the only shape it knows.
      Obj.update(parent2, (parent2) => {
        const items = Obj.getValue(parent2, ['items']);
        invariant(Array.isArray(items), 'expected the source array to remain');
        items[0].name = 'alpha renamed by peer B';
      });
      await db2.flush();

      await heal();
      await syncAll(db1, db2);
      await expect
        .poll(() => {
          const items: unknown = Obj.getValue(parent1, ['items']);
          return Array.isArray(items) ? items[0]?.name : undefined;
        })
        .toBe('alpha renamed by peer B');

      const [child] = await db1.query(Filter.type(ArrayFanChildDoc)).run();
      invariant(child, 'expected the split child to exist on peer A');
      // Not yet folded.
      expect(child.name).toBe('alpha');

      await db1.foldForward([fanOutMigration]);
      expect(child.name).toBe('alpha renamed by peer B');

      // Converges: peer B's own view of the (retired) source array is untouched by the fold, which
      // only ever writes the CHILD's document.
      await syncAll(db1, db2);
      expect(Obj.getValue(parent2, ['items', 0, 'name'])).toBe('alpha renamed by peer B');
    } finally {
      await builder.close();
      await pair.network.close();
    }
  });
});

//
// Copyright 2026 DXOS.org
//

import { next as A } from '@automerge/automerge';
import * as Option from 'effect/Option';
import * as Schema from 'effect/Schema';
import { describe, expect, test } from 'vitest';

import { Context } from '@dxos/context';
import { Annotation, DXN, Filter, Migration, Obj, Ref, Type } from '@dxos/echo';
import { EchoTestBuilder, type EchoTestPeer, getObjectCore } from '@dxos/echo-client/testing';
import { TestReplicationNetwork, type TestReplicator } from '@dxos/echo-host/testing';
import { invariant } from '@dxos/invariant';
import { PublicKey } from '@dxos/keys';

//
// Phase D item 3 (`.agents/projects/lenses/IMPLEMENTATION-PLAN.md`; M0-REPORT.md design item 3):
// fan-in through the real `Migration.defineFanIn` API. All three ingredients the report calls
// independently load-bearing — a declared removal choice, a declared collision resolution, and a
// query-based late-child pass — are exercised against the real runner, not a hand-rolled prototype.
//

class FanInParentDoc extends Type.makeObject<FanInParentDoc>(DXN.make('org.dxos.test.migration.fanin.Parent', '0.1.0'))(
  Schema.Struct({ employerName: Schema.optional(Schema.String) }),
) {}

class FanInChildDoc extends Type.makeObject<FanInChildDoc>(DXN.make('org.dxos.test.migration.fanin.Child', '0.1.0'))(
  Schema.Struct({ street: Schema.optional(Schema.String), parent: Schema.optional(Ref.Ref(FanInParentDoc)) }),
) {}

const absorbStreet = (child: { readonly street?: string }): Record<string, unknown> => ({
  employerName: child.street,
});

class FanInPairParentDoc extends Type.makeObject<FanInPairParentDoc>(
  DXN.make('org.dxos.test.migration.fanin.PairParent', '0.1.0'),
)(Schema.Struct({ employerName: Schema.optional(Schema.String), city: Schema.optional(Schema.String) })) {}

class FanInPairChildDoc extends Type.makeObject<FanInPairChildDoc>(
  DXN.make('org.dxos.test.migration.fanin.PairChild', '0.1.0'),
)(
  Schema.Struct({
    street: Schema.optional(Schema.String),
    city: Schema.optional(Schema.String),
    parent: Schema.optional(Ref.Ref(FanInPairParentDoc)),
  }),
) {}

class FanInOtherChildDoc extends Type.makeObject<FanInOtherChildDoc>(
  DXN.make('org.dxos.test.migration.fanin.OtherChild', '0.1.0'),
)(Schema.Struct({ city: Schema.optional(Schema.String), parent: Schema.optional(Ref.Ref(FanInParentDoc)) })) {}

/** The type an absorbed {@link FanInChildDoc} switches to before being tombstoned, in the type-switch tests below. */
class FanInChildTombstoneDoc extends Type.makeObject<FanInChildTombstoneDoc>(
  DXN.make('org.dxos.test.migration.fanin.ChildTombstone', '0.1.0'),
)(Schema.Struct({})) {}

describe('migration fan-in: definition-time checks', () => {
  test('is a definition error to omit "collision"', () => {
    expect(() =>
      Migration.defineFanIn({
        id: 'org.dxos.test.fanin.street',
        from: FanInChildDoc,
        parentOf: (child) => child.parent,
        absorb: absorbStreet,
        removal: 'tombstone',
      }),
    ).toThrow(/collision/);
  });

  test('is a definition error to omit "removal"', () => {
    expect(() =>
      Migration.defineFanIn({
        id: 'org.dxos.test.fanin.street',
        from: FanInChildDoc,
        parentOf: (child) => child.parent,
        absorb: absorbStreet,
        collision: 'parent-wins',
      }),
    ).toThrow(/removal/);
  });
});

describe('migration fan-in: absorption, collision, and the late-child path', () => {
  test('a single child is absorbed into its parent and tombstoned; re-running is a no-op', async () => {
    await using builder = await new EchoTestBuilder().open();
    const peer = await builder.createPeer({ types: [FanInParentDoc, FanInChildDoc] });
    await using db = await peer.createDatabase();

    const parent = db.add(Obj.make(FanInParentDoc, {}));
    const child = db.add(Obj.make(FanInChildDoc, { street: '123 Main St' }));
    Obj.update(child, (child) => {
      child.parent = Ref.make(parent);
    });
    await db.flush();

    const migration = Migration.defineFanIn({
      id: 'org.dxos.test.fanin.street',
      from: FanInChildDoc,
      parentOf: (child) => child.parent,
      absorb: absorbStreet,
      collision: 'parent-wins',
      removal: 'tombstone',
    });

    await db.runMigrations([migration]);

    expect(parent.employerName).toBe('123 Main St');
    expect(getObjectCore(child).isDeleted()).toBe(true);
    // Tombstoned, never erased — still readable.
    expect(child.street).toBe('123 Main St');

    // Re-running: the child is already tombstoned (excluded from the default `Filter.type` query),
    // so the migration finds nothing to absorb and writes nothing new.
    await db.runMigrations([migration]);
    expect(parent.employerName).toBe('123 Main St');
  });

  test('a declared collision resolution decides a property both a parent and a later child define', async () => {
    await using builder = await new EchoTestBuilder().open();
    const peer = await builder.createPeer({ types: [FanInParentDoc, FanInChildDoc] });
    await using db = await peer.createDatabase();

    const parent = db.add(Obj.make(FanInParentDoc, {}));
    const childA = db.add(Obj.make(FanInChildDoc, { street: 'Alpha St' }));
    const childB = db.add(Obj.make(FanInChildDoc, { street: 'Beta St' }));
    Obj.update(childA, (childA) => {
      childA.parent = Ref.make(parent);
    });
    Obj.update(childB, (childB) => {
      childB.parent = Ref.make(parent);
    });
    await db.flush();

    // Order-independent so the test does not depend on which child the runner absorbs first.
    const migration = Migration.defineFanIn({
      id: 'org.dxos.test.fanin.street',
      from: FanInChildDoc,
      parentOf: (child) => child.parent,
      absorb: absorbStreet,
      collision: (parentValue, childValue) => [String(parentValue), String(childValue)].sort().join('|'),
      removal: 'tombstone',
    });

    await db.runMigrations([migration]);

    expect(parent.employerName).toBe(['Alpha St', 'Beta St'].sort().join('|'));
    expect(getObjectCore(childA).isDeleted()).toBe(true);
    expect(getObjectCore(childB).isDeleted()).toBe(true);
  });

  test('a child created AFTER an earlier run "completed" is absorbed on the next run (the query-based late-child path)', async () => {
    await using builder = await new EchoTestBuilder().open();
    const peer = await builder.createPeer({ types: [FanInParentDoc, FanInChildDoc] });
    await using db = await peer.createDatabase();

    const parent = db.add(Obj.make(FanInParentDoc, {}));
    await db.flush();

    const migration = Migration.defineFanIn({
      id: 'org.dxos.test.fanin.street',
      from: FanInChildDoc,
      parentOf: (child) => child.parent,
      absorb: absorbStreet,
      collision: 'parent-wins',
      removal: 'tombstone',
    });

    // "Completed": no children exist yet.
    await db.runMigrations([migration]);
    expect(parent.employerName).toBeUndefined();
    expect(await db.query(Filter.type(FanInChildDoc)).run()).toHaveLength(0);

    // An old-schema client creates a brand-new child for a parent it believes is unmigrated.
    const lateChild = db.add(Obj.make(FanInChildDoc, { street: 'Late St' }));
    Obj.update(lateChild, (lateChild) => {
      lateChild.parent = Ref.make(parent);
    });
    await db.flush();

    // Re-running finds it by TYPE, not by any tracked "pending" set, and absorbs it.
    await db.runMigrations([migration]);

    expect(parent.employerName).toBe('Late St');
    expect(getObjectCore(lateChild).isDeleted()).toBe(true);
    expect(await db.query(Filter.type(FanInChildDoc)).run()).toHaveLength(0);
  });
});

describe('migration fan-in: type switch on absorption', () => {
  test('a declared "to" switches the tombstoned child\'s type and records the fan-in marker', async () => {
    await using builder = await new EchoTestBuilder().open();
    const peer = await builder.createPeer({ types: [FanInParentDoc, FanInChildDoc, FanInChildTombstoneDoc] });
    await using db = await peer.createDatabase();

    const parent = db.add(Obj.make(FanInParentDoc, {}));
    const child = db.add(Obj.make(FanInChildDoc, { street: '1 Infinite Loop' }));
    Obj.update(child, (child) => {
      child.parent = Ref.make(parent);
    });
    await db.flush();

    const migration = Migration.defineFanIn({
      id: 'org.dxos.test.fanin.street',
      from: FanInChildDoc,
      to: FanInChildTombstoneDoc,
      parentOf: (child) => child.parent,
      absorb: absorbStreet,
      collision: 'parent-wins',
      removal: 'tombstone',
    });

    await db.runMigrations([migration]);

    expect(parent.employerName).toBe('1 Infinite Loop');
    expect(getObjectCore(child).isDeleted()).toBe(true);
    expect(Obj.getTypeURI(child).toString()).toBe(migration.toType?.toString());

    const marker = Annotation.get(child, Migration.FanInMarkerAnnotation);
    invariant(Option.isSome(marker), 'expected a fan-in marker on the absorbed child');
    expect(marker.value.parentId).toBe(parent.id);
  });

  test('a late write to a type-switched child still folds into the parent', async () => {
    await using builder = await new EchoTestBuilder().open();
    const peer = await builder.createPeer({ types: [FanInParentDoc, FanInChildDoc, FanInChildTombstoneDoc] });
    await using db = await peer.createDatabase();

    const parent = db.add(Obj.make(FanInParentDoc, {}));
    const child = db.add(Obj.make(FanInChildDoc, { street: '1 Infinite Loop' }));
    Obj.update(child, (child) => {
      child.parent = Ref.make(parent);
    });
    await db.flush();

    const migration = Migration.defineFanIn({
      id: 'org.dxos.test.fanin.street',
      from: FanInChildDoc,
      to: FanInChildTombstoneDoc,
      parentOf: (child) => child.parent,
      absorb: absorbStreet,
      collision: 'child-wins',
      removal: 'tombstone',
    });
    await db.runMigrations([migration]);

    getObjectCore(child).setDecoded(['data', 'street'], '2 Late Loop');
    await db.flush();
    await db.foldForward([migration]);

    expect(parent.employerName).toBe('2 Late Loop');
  });

  test('two fan-ins sharing a "to" type each fold only the children they absorbed', async () => {
    await using builder = await new EchoTestBuilder().open();
    const peer = await builder.createPeer({
      types: [FanInParentDoc, FanInChildDoc, FanInOtherChildDoc, FanInChildTombstoneDoc],
    });
    await using db = await peer.createDatabase();

    const parent = db.add(Obj.make(FanInParentDoc, {}));
    const other = db.add(Obj.make(FanInOtherChildDoc, { city: 'Paris' }));
    Obj.update(other, (other) => {
      other.parent = Ref.make(parent);
    });
    await db.flush();

    const streetFanIn = Migration.defineFanIn({
      id: 'org.dxos.test.fanin.street',
      from: FanInChildDoc,
      to: FanInChildTombstoneDoc,
      parentOf: (child) => child.parent,
      absorb: absorbStreet,
      collision: 'child-wins',
      removal: 'tombstone',
    });
    const cityFanIn = Migration.defineFanIn({
      id: 'org.dxos.test.fanin.city',
      from: FanInOtherChildDoc,
      to: FanInChildTombstoneDoc,
      parentOf: (child) => child.parent,
      absorb: (child) => ({ employerName: child.city }),
      collision: 'child-wins',
      removal: 'tombstone',
    });
    await db.runMigrations([streetFanIn, cityFanIn]);
    expect(parent.employerName).toBe('Paris');

    getObjectCore(other).setDecoded(['data', 'city'], 'Lyon');
    await db.flush();
    await db.foldForward([streetFanIn, cityFanIn]);

    expect(parent.employerName).toBe('Lyon');
  });

  test('a late write to one child key leaves a direct edit to another absorbed key alone', async () => {
    await using builder = await new EchoTestBuilder().open();
    const peer = await builder.createPeer({ types: [FanInPairParentDoc, FanInPairChildDoc] });
    await using db = await peer.createDatabase();

    const parent = db.add(Obj.make(FanInPairParentDoc, {}));
    const child = db.add(Obj.make(FanInPairChildDoc, { street: '1 Main St', city: 'Paris' }));
    Obj.update(child, (child) => {
      child.parent = Ref.make(parent);
    });
    await db.flush();

    const migration = Migration.defineFanIn({
      id: 'org.dxos.test.fanin.pair',
      from: FanInPairChildDoc,
      parentOf: (child) => child.parent,
      absorb: (child) => ({ employerName: child.street, city: child.city }),
      collision: 'child-wins',
      removal: 'tombstone',
    });
    await db.runMigrations([migration]);

    Obj.update(parent, (parent) => {
      parent.city = 'Lyon';
    });
    getObjectCore(child).setDecoded(['data', 'street'], '2 Side St');
    await db.flush();
    await db.foldForward([migration]);

    expect(parent.employerName).toBe('2 Side St');
    expect(parent.city).toBe('Lyon');
    expect(Obj.getConflict(parent, 'city')).toBeUndefined();
  });

  test('a child write that lands while the runner absorbs it is folded forward', async () => {
    await using builder = await new EchoTestBuilder().open();
    const peer = await builder.createPeer({ types: [FanInParentDoc, FanInChildDoc] });
    await using db = await peer.createDatabase();

    const parent = db.add(Obj.make(FanInParentDoc, {}));
    const child = db.add(Obj.make(FanInChildDoc, { street: '1 Main St' }));
    Obj.update(child, (child) => {
      child.parent = Ref.make(parent);
    });
    await db.flush();

    // Stands in for a replicated old-client write arriving after the runner read the child.
    let duringAbsorb: (() => void) | undefined = () => {
      duringAbsorb = undefined;
      getObjectCore(child).setDecoded(['data', 'street'], '2 Late St');
    };
    const migration = Migration.defineFanIn({
      id: 'org.dxos.test.fanin.street',
      from: FanInChildDoc,
      parentOf: (child) => child.parent,
      absorb: (child) => {
        duringAbsorb?.();
        return absorbStreet(child);
      },
      collision: 'child-wins',
      removal: 'tombstone',
    });
    await db.runMigrations([migration]);
    await db.foldForward([migration]);

    expect(parent.employerName).toBe('2 Late St');
  });

  test('two fan-ins from the same type fold only the children they absorbed', async () => {
    await using builder = await new EchoTestBuilder().open();
    const peer = await builder.createPeer({ types: [FanInParentDoc, FanInOtherChildDoc] });
    await using db = await peer.createDatabase();

    const parent = db.add(Obj.make(FanInParentDoc, {}));
    const other = db.add(Obj.make(FanInOtherChildDoc, { city: 'Paris' }));
    Obj.update(other, (other) => {
      other.parent = Ref.make(parent);
    });
    await db.flush();

    // Absorbs nothing itself, since it resolves no parent, but queries the same type.
    const unrelatedFanIn = Migration.defineFanIn({
      id: 'org.dxos.test.fanin.unrelated',
      from: FanInOtherChildDoc,
      parentOf: () => undefined,
      absorb: (child) => ({ employerName: `unrelated ${child.city}` }),
      collision: 'child-wins',
      removal: 'tombstone',
    });
    const cityFanIn = Migration.defineFanIn({
      id: 'org.dxos.test.fanin.city',
      from: FanInOtherChildDoc,
      parentOf: (child) => child.parent,
      absorb: (child) => ({ employerName: child.city }),
      collision: 'child-wins',
      removal: 'tombstone',
    });
    await db.runMigrations([unrelatedFanIn, cityFanIn]);
    expect(parent.employerName).toBe('Paris');

    getObjectCore(other).setDecoded(['data', 'city'], 'Lyon');
    await db.flush();
    await db.foldForward([unrelatedFanIn, cityFanIn]);

    expect(parent.employerName).toBe('Lyon');
  });
});

describe('migration fan-in: fold-forward for late child writes', () => {
  const setUp = async (builder: EchoTestBuilder) => {
    const peer = await builder.createPeer({ types: [FanInParentDoc, FanInChildDoc] });
    const db = await peer.createDatabase();

    const parent = db.add(Obj.make(FanInParentDoc, {}));
    const child = db.add(Obj.make(FanInChildDoc, { street: '123 Main St' }));
    Obj.update(child, (child) => {
      child.parent = Ref.make(parent);
    });
    await db.flush();

    // `child-wins`: unlike `parent-wins` (where a disagreement always keeps whatever the parent
    // already holds, so a later fold could never move it), this lets a late child value actually
    // supersede what an earlier absorb wrote — the case these tests exercise.
    const migration = Migration.defineFanIn({
      id: 'org.dxos.test.fanin.street',
      from: FanInChildDoc,
      parentOf: (child) => child.parent,
      absorb: absorbStreet,
      collision: 'child-wins',
      removal: 'tombstone',
    });

    await db.runMigrations([migration]);
    expect(parent.employerName).toBe('123 Main St');

    return { db, parent, child, migration };
  };

  test('a late write to an absorbed child folds into the parent; a second pass is a no-op', async () => {
    await using builder = await new EchoTestBuilder().open();
    const { db, parent, child, migration } = await setUp(builder);

    // An old client, unaware the child was absorbed and tombstoned, writes its only known shape
    // directly onto the raw document — the same way a replicated old-schema change would land.
    getObjectCore(child).setDecoded(['data', 'street'], '456 Side St');
    await db.flush();
    expect(parent.employerName).toBe('123 Main St'); // Not yet folded.

    await db.foldForward([migration]);
    expect(parent.employerName).toBe('456 Side St');

    // The checkpoint (`foldedAt`) advanced, so a second pass with nothing new writes nothing.
    const parentCore = getObjectCore(parent);
    const historyLength = A.getHistory(parentCore.getDoc()).length;
    await db.foldForward([migration]);
    expect(A.getHistory(parentCore.getDoc())).to.have.length(historyLength);
    expect(parent.employerName).toBe('456 Side St');
  });

  test('a direct edit on the parent concurrent with a late child edit is a real conflict; Obj.getConflict presents the direct edit and lists the fold', async () => {
    await using builder = await new EchoTestBuilder().open();
    const { db, parent, child, migration } = await setUp(builder);

    // A direct edit through the ordinary API...
    Obj.update(parent, (parent) => {
      parent.employerName = 'HQ';
    });
    await db.flush();

    // ...concurrent (in CRDT terms — the fold is forced back to the recorded absorb-time parent
    // heads) with a late old-schema write to the tombstoned child.
    getObjectCore(child).setDecoded(['data', 'street'], '456 Side St');
    await db.flush();

    await db.foldForward([migration]);

    // User wins: `Obj.getConflict`'s policy-resolved `presented` value is the direct edit, the late
    // child value is not lost — it is a browsable alternative.
    const conflict = Obj.getConflict(parent, 'employerName');
    invariant(conflict, 'expected a real Automerge conflict on employerName');
    expect(conflict.presented).toBe('HQ');
    expect(conflict.alternatives).toHaveLength(2);
    const fold = conflict.alternatives.find((alternative) => alternative.fold);
    const direct = conflict.alternatives.find((alternative) => !alternative.fold);
    expect(fold?.value).toBe('456 Side St');
    expect(direct?.value).toBe('HQ');
  });
});

describe('migration fan-in: "parent-wins" only protects a value the parent actually had', () => {
  test('the parent lacked the key at absorb time: a late child edit folds in even under "parent-wins"', async () => {
    await using builder = await new EchoTestBuilder().open();
    const peer = await builder.createPeer({ types: [FanInParentDoc, FanInChildDoc] });
    await using db = await peer.createDatabase();

    // The parent has no `employerName` yet, so absorption copies the child's value in — that value is
    // recorded as `fromChild`, not a "parent already won" collision.
    const parent = db.add(Obj.make(FanInParentDoc, {}));
    const child = db.add(Obj.make(FanInChildDoc, { street: '123 Main St' }));
    Obj.update(child, (child) => {
      child.parent = Ref.make(parent);
    });
    await db.flush();

    const migration = Migration.defineFanIn({
      id: 'org.dxos.test.fanin.street',
      from: FanInChildDoc,
      parentOf: (child) => child.parent,
      absorb: absorbStreet,
      collision: 'parent-wins',
      removal: 'tombstone',
    });

    await db.runMigrations([migration]);
    expect(parent.employerName).toBe('123 Main St');

    // An old client, unaware the child was absorbed, writes its only known shape directly.
    getObjectCore(child).setDecoded(['data', 'street'], '456 Side St');
    await db.flush();
    expect(parent.employerName).toBe('123 Main St'); // Not yet folded.

    await db.foldForward([migration]);
    // Before the `fromChild` fix this stayed '123 Main St' forever: the collision policy compared the
    // late edit against a parent value that only existed because THIS child put it there, and
    // "parent-wins" kept it — a `parent-wins` fan-in's very first absorption was frozen for good.
    expect(parent.employerName).toBe('456 Side St');

    const parentCore = getObjectCore(parent);
    const historyLength = A.getHistory(parentCore.getDoc()).length;
    await db.foldForward([migration]);
    expect(A.getHistory(parentCore.getDoc())).to.have.length(historyLength);
  });

  test('the parent already had its own value at absorb time: a late child edit does NOT overwrite it under "parent-wins"', async () => {
    await using builder = await new EchoTestBuilder().open();
    const peer = await builder.createPeer({ types: [FanInParentDoc, FanInChildDoc] });
    await using db = await peer.createDatabase();

    // The parent already has its own `employerName` — a genuine collision at absorb time, which
    // "parent-wins" resolves by keeping the parent's value; NOT recorded as `fromChild`.
    const parent = db.add(Obj.make(FanInParentDoc, { employerName: 'Existing HQ' }));
    const child = db.add(Obj.make(FanInChildDoc, { street: '123 Main St' }));
    Obj.update(child, (child) => {
      child.parent = Ref.make(parent);
    });
    await db.flush();

    const migration = Migration.defineFanIn({
      id: 'org.dxos.test.fanin.street',
      from: FanInChildDoc,
      parentOf: (child) => child.parent,
      absorb: absorbStreet,
      collision: 'parent-wins',
      removal: 'tombstone',
    });

    await db.runMigrations([migration]);
    expect(parent.employerName).toBe('Existing HQ');

    getObjectCore(child).setDecoded(['data', 'street'], '456 Side St');
    await db.flush();

    await db.foldForward([migration]);
    // The parent's own value is a real collision every time, exactly like the initial absorption —
    // "parent-wins" protects it from every later child edit, not just the first one.
    expect(parent.employerName).toBe('Existing HQ');
  });

  test('a direct parent edit to an absorbed-from-child key, concurrent with a late child edit, is a real conflict under "parent-wins"', async () => {
    await using builder = await new EchoTestBuilder().open();
    const peer = await builder.createPeer({ types: [FanInParentDoc, FanInChildDoc] });
    await using db = await peer.createDatabase();

    const parent = db.add(Obj.make(FanInParentDoc, {}));
    const child = db.add(Obj.make(FanInChildDoc, { street: '123 Main St' }));
    Obj.update(child, (child) => {
      child.parent = Ref.make(parent);
    });
    await db.flush();

    const migration = Migration.defineFanIn({
      id: 'org.dxos.test.fanin.street',
      from: FanInChildDoc,
      parentOf: (child) => child.parent,
      absorb: absorbStreet,
      collision: 'parent-wins',
      removal: 'tombstone',
    });

    await db.runMigrations([migration]);
    expect(parent.employerName).toBe('123 Main St');

    // A direct edit through the ordinary API, on a key that came FROM THE CHILD at absorb time...
    Obj.update(parent, (parent) => {
      parent.employerName = 'HQ';
    });
    await db.flush();

    // ...concurrent with a late old-schema write to the tombstoned child.
    getObjectCore(child).setDecoded(['data', 'street'], '456 Side St');
    await db.flush();

    await db.foldForward([migration]);

    const conflict = Obj.getConflict(parent, 'employerName');
    invariant(conflict, 'expected a real Automerge conflict on employerName');
    expect(conflict.presented).toBe('HQ');
    expect(conflict.alternatives).toHaveLength(2);
    const fold = conflict.alternatives.find((alternative) => alternative.fold);
    const direct = conflict.alternatives.find((alternative) => !alternative.fold);
    expect(fold?.value).toBe('456 Side St');
    expect(direct?.value).toBe('HQ');
  });
});

/**
 * Reimplements `fold-forward.test.ts`'s own `createAsymmetricPartitionedPair`: peer B registers ONLY
 * the child type — a genuinely old client that never learns the parent type even exists — so its edit
 * to the child crosses the partition as ordinary replicated data, never through anything fan-in-aware.
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

  return { network, peer1, peer2, partition, heal };
};

describe('migration fan-in: fold-forward across a real partition, peer B a genuinely old client', () => {
  test('peer B edits the absorbed child while partitioned; after heal, foldForward carries the edit into the parent and both peers converge', async () => {
    // Not `await using`: the network must close AFTER the builder (which disconnects each peer's
    // replicator while the network is still open) — the reverse, LIFO order `using` would give here.
    const builder = await new EchoTestBuilder().open();
    let network: TestReplicationNetwork | undefined;
    try {
      const [spaceKey] = PublicKey.randomSequence();
      const pair = await createAsymmetricPartitionedPair(builder, [FanInParentDoc, FanInChildDoc], [FanInChildDoc]);
      network = pair.network;
      const { peer1, peer2, partition, heal } = pair;
      try {
        await using db1 = await peer1.createDatabase(spaceKey);
        const parent = db1.add(Obj.make(FanInParentDoc, {}));
        const child = db1.add(Obj.make(FanInChildDoc, { street: '123 Main St' }));
        Obj.update(child, (child) => {
          child.parent = Ref.make(parent);
        });
        await db1.flush();

        const rootUrl = db1.rootUrl;
        invariant(rootUrl, 'root url');
        await using db2 = await peer2.openDatabase(spaceKey, rootUrl);
        await db2.waitUntilHeadsReplicated(await db1.getDocumentHeads());
        await db2.updateIndexes();
        let childOnB: FanInChildDoc | undefined;
        await expect
          .poll(async () => {
            [childOnB] = await db2.query(Filter.id(child.id)).run();
            return childOnB;
          })
          .toBeDefined();
        invariant(childOnB, 'expected the replicated child to be queryable on peer B');

        await partition();

        // `child-wins`, not `parent-wins` — see the fold-forward describe block's `setUp` for why.
        const migration = Migration.defineFanIn({
          id: 'org.dxos.test.fanin.street',
          from: FanInChildDoc,
          parentOf: (child) => child.parent,
          absorb: absorbStreet,
          collision: 'child-wins',
          removal: 'tombstone',
        });

        // Peer A absorbs while partitioned.
        await db1.runMigrations([migration]);
        expect(parent.employerName).toBe('123 Main St');

        // Peer B, unaware the child was ever absorbed, keeps writing the only shape it knows.
        Obj.update(childOnB, (childOnB) => {
          childOnB.street = 'Old Client St';
        });
        await db2.flush();

        await heal();
        await db1.waitUntilHeadsReplicated(await db2.getDocumentHeads());
        await db2.waitUntilHeadsReplicated(await db1.getDocumentHeads());
        await db1.updateIndexes();
        await db2.updateIndexes();

        // Heads replication does not guarantee peer A's client already holds the write.
        await expect.poll(() => getObjectCore(child).getDecoded(['data', 'street'])).toBe('Old Client St');
        // Not yet folded: the late write replicated onto the tombstoned child, the parent is untouched.
        expect(parent.employerName).toBe('123 Main St');

        await db1.foldForward([migration]);
        expect(parent.employerName).toBe('Old Client St');

        // Converges on peer B too, read via `Obj.getValue` — peer B never registered `FanInParentDoc`
        // and so cannot resolve a typed accessor for it.
        await db2.waitUntilHeadsReplicated(await db1.getDocumentHeads());
        await db2.updateIndexes();
        await expect
          .poll(async () => {
            const [parentOnB] = await db2.query(Filter.id(parent.id)).run();
            return parentOnB && Obj.getValue(parentOnB, ['employerName']);
          })
          .toBe('Old Client St');
      } finally {
        // Runs BEFORE the outer `finally`: closes the peers (and so their replicators) while the
        // network is still open, matching `fold-forward.test.ts`'s own `afterEach` ordering.
        await builder.close();
      }
    } finally {
      await network?.close();
    }
  });
});

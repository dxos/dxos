//
// Copyright 2026 DXOS.org
//

import * as Schema from 'effect/Schema';
import { describe, expect, test } from 'vitest';

import { DXN, Filter, Migration, Obj, Ref, Type } from '@dxos/echo';
import { EchoTestBuilder, getObjectCore } from '@dxos/echo-client/testing';

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

const absorbStreet = (parent: Obj.Unknown, child: FanInChildDoc): Record<string, unknown> => ({
  employerName: child.street,
});

describe('migration fan-in: definition-time checks', () => {
  test('is a definition error to omit "collision"', () => {
    expect(() =>
      Migration.defineFanIn({
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

//
// Copyright 2025 DXOS.org
//

import * as Registry from '@effect-atom/atom/Registry';
import { afterEach, beforeEach, describe, expect, test } from 'vitest';

import { Filter, Obj, Ref } from '@dxos/echo';
import { type EchoDatabase } from '@dxos/echo-db';
import { EchoTestBuilder } from '@dxos/echo-db/testing';
import { TestSchema } from '@dxos/echo/testing';
import { PublicKey } from '@dxos/keys';

import * as AtomObj from './atom';
import * as AtomRef from './ref-atom';

describe('AtomRef - Basic Functionality', () => {
  let testBuilder: EchoTestBuilder;
  let db: EchoDatabase;
  let registry: Registry.Registry;

  beforeEach(async () => {
    testBuilder = await new EchoTestBuilder().open();
    const { db: database } = await testBuilder.createDatabase();
    db = database;
    registry = Registry.make();
  });

  afterEach(async () => {
    await testBuilder.close();
  });

  test('AtomRef.make returns target when ref is loaded', async () => {
    await db.graph.schemaRegistry.register([TestSchema.Person]);

    const targetObj = Obj.make(TestSchema.Person, { name: 'Target', username: 'target', email: 'target@example.com' });
    db.add(targetObj);
    await db.flush();

    const ref = Ref.make(targetObj);
    const atom = AtomRef.make(ref);

    // Should return the target object (as a snapshot).
    const result = registry.get(atom);
    expect(result?.name).toBe('Target');
  });

  test('AtomRef.make does not subscribe to target changes (use AtomObj for reactive snapshots)', async () => {
    await db.graph.schemaRegistry.register([TestSchema.Person]);

    const targetObj = Obj.make(TestSchema.Person, { name: 'Target', username: 'target', email: 'target@example.com' });
    db.add(targetObj);
    await db.flush();

    const ref = Ref.make(targetObj);
    const atom = AtomRef.make(ref);

    // Subscribe to updates.
    let updateCount = 0;
    registry.subscribe(atom, () => updateCount++, { immediate: true });

    expect(updateCount).toBe(1);

    // Mutate target - ref atom does NOT react to this.
    Obj.change(targetObj, (targetObj) => {
      targetObj.name = 'Updated';
    });

    // Update count should still be 1 - ref atom doesn't subscribe to target changes.
    expect(updateCount).toBe(1);
  });
});

describe('AtomRef - Referential Equality', () => {
  let testBuilder: EchoTestBuilder;
  let db: EchoDatabase;
  let registry: Registry.Registry;

  beforeEach(async () => {
    testBuilder = await new EchoTestBuilder().open();
    const { db: database } = await testBuilder.createDatabase();
    db = database;
    registry = Registry.make();
  });

  afterEach(async () => {
    await testBuilder.close();
  });

  test('AtomRef.make returns same atom instance for same ref', async () => {
    await db.graph.schemaRegistry.register([TestSchema.Person]);

    const targetObj = Obj.make(TestSchema.Person, { name: 'Target', username: 'target', email: 'target@example.com' });
    db.add(targetObj);
    await db.flush();

    const ref = Ref.make(targetObj);

    const atom1 = AtomRef.make(ref);
    const atom2 = AtomRef.make(ref);

    // Same ref should return the exact same atom instance.
    expect(atom1).toBe(atom2);
  });

  test('AtomRef.make returns different atom instances for different refs', async () => {
    await db.graph.schemaRegistry.register([TestSchema.Person]);

    const targetObj1 = Obj.make(TestSchema.Person, {
      name: 'Target1',
      username: 'target1',
      email: 'target1@example.com',
    });
    const targetObj2 = Obj.make(TestSchema.Person, {
      name: 'Target2',
      username: 'target2',
      email: 'target2@example.com',
    });
    db.add(targetObj1);
    db.add(targetObj2);
    await db.flush();

    const ref1 = Ref.make(targetObj1);
    const ref2 = Ref.make(targetObj2);

    const atom1 = AtomRef.make(ref1);
    const atom2 = AtomRef.make(ref2);

    // Different refs should return different atom instances.
    expect(atom1).not.toBe(atom2);
  });

  test('AtomRef.make returns same atom for refs created separately to same target', async () => {
    await db.graph.schemaRegistry.register([TestSchema.Person]);

    const targetObj = Obj.make(TestSchema.Person, { name: 'Target', username: 'target', email: 'target@example.com' });
    db.add(targetObj);
    await db.flush();

    // Create two separate refs to the same target.
    const ref1 = Ref.make(targetObj);
    const ref2 = Ref.make(targetObj);

    // Refs are different objects (not referentially equal).
    expect(ref1).not.toBe(ref2);

    const atom1 = AtomRef.make(ref1);
    const atom2 = AtomRef.make(ref2);

    // Refs with the same DXN resolve to the same atom via Hash/Equal traits.
    expect(atom1).toBe(atom2);

    // Both atoms should return the same target data.
    expect(registry.get(atom1)?.name).toBe('Target');
    expect(registry.get(atom2)?.name).toBe('Target');
  });

  test('cached ref atoms return same instance after multiple retrievals', async () => {
    await db.graph.schemaRegistry.register([TestSchema.Person]);

    const targetObj = Obj.make(TestSchema.Person, { name: 'Target', username: 'target', email: 'target@example.com' });
    db.add(targetObj);
    await db.flush();

    const ref = Ref.make(targetObj);

    // Get the same atom multiple times.
    const atom1 = AtomRef.make(ref);
    const atom2 = AtomRef.make(ref);
    const atom3 = AtomRef.make(ref);

    // All should be the same instance.
    expect(atom1).toBe(atom2);
    expect(atom2).toBe(atom3);

    // All should return the same target value.
    expect(registry.get(atom1)?.name).toBe('Target');
    expect(registry.get(atom2)?.name).toBe('Target');
    expect(registry.get(atom3)?.name).toBe('Target');
  });
});

describe('AtomRef - Cross-client reactive loading', () => {
  let testBuilder: EchoTestBuilder;
  let registry: Registry.Registry;

  beforeEach(async () => {
    testBuilder = await new EchoTestBuilder().open();
    registry = Registry.make();
  });

  afterEach(async () => {
    await testBuilder.close();
  });

  // Reproduces the journal quick-entry bug: two clients sharing services, where
  // sibling client adds a brand new object referenced from an existing parent.
  // The ref atom for the new entry must eventually update with the loaded target,
  // even if the ref's document arrives at client 1 slightly after the parent mutation.
  test('ref atom eventually resolves a target created by a sibling client', { timeout: 15_000 }, async () => {
    const [spaceKey] = PublicKey.randomSequence();

    await using peer = await testBuilder.createPeer({
      types: [TestSchema.Person, TestSchema.Container],
    });

    // Client 1 creates the database with a Container parent.
    await using db1 = await peer.createDatabase(spaceKey);
    const parent1 = db1.add(Obj.make(TestSchema.Container, { objects: [] }));
    await db1.flush();

    // Client 2 opens the same database via a sibling client.
    await using client2 = await peer.createClient();
    await using db2 = await peer.openDatabase(spaceKey, db1.rootUrl!, {
      client: client2,
    });

    // Wait for the parent to be replicated to client 2.
    const [parent2] = await db2.query(Filter.id(parent1.id)).run();
    expect(parent2).toBeDefined();

    const newPerson = db2.add(
      Obj.make(TestSchema.Person, { name: 'Alice', username: 'alice', email: 'alice@example.com' }),
    );
    Obj.change(parent2!, (p) => {
      p.objects = [...(p.objects ?? []), Ref.make(newPerson)];
    });
    await db2.flush();

    // Wait until client 1 sees the parent's objects list update with the new ref.
    await expect.poll(() => (parent1.objects ?? []).length, { timeout: 10_000 }).toBeGreaterThan(0);

    // Take the ref from client 1's side (i.e., the ref whose target hasn't been
    // materialized locally yet) and subscribe via the atom. This is what
    // useObject(entryRef) does in the journal component.
    const ref = parent1.objects![0];
    const atom = AtomObj.make(ref);

    let lastValue: any;
    registry.subscribe(
      atom,
      (value) => {
        lastValue = value;
      },
      { immediate: true },
    );

    // The atom must eventually reflect the loaded target.
    // BEFORE the fix: the atom never updates because ref.load() throws when the
    // entry's document hasn't propagated yet, the error is swallowed, and there
    // is no retry/subscription to resolve it later.
    await expect.poll(() => lastValue?.name, { timeout: 10_000 }).toBe('Alice');
  });
});

describe('AtomRef - Expando Objects', () => {
  let testBuilder: EchoTestBuilder;
  let db: EchoDatabase;
  let registry: Registry.Registry;

  beforeEach(async () => {
    testBuilder = await new EchoTestBuilder().open();
    const { db: database } = await testBuilder.createDatabase();
    db = database;
    registry = Registry.make();
  });

  afterEach(async () => {
    await testBuilder.close();
  });

  test('works with Expando objects', async () => {
    const targetObj = Obj.make(TestSchema.Expando, { name: 'Expando Target', value: 42 });
    db.add(targetObj);
    await db.flush();

    const ref = Ref.make(targetObj);
    const atom = AtomRef.make(ref);

    const result = registry.get(atom);
    expect(result?.name).toBe('Expando Target');
    expect(result?.value).toBe(42);
  });
});

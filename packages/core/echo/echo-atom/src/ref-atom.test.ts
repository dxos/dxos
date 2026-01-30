//
// Copyright 2025 DXOS.org
//

import * as Registry from '@effect-atom/atom/Registry';
import { afterEach, beforeEach, describe, expect, test } from 'vitest';

import { Obj, Ref } from '@dxos/echo';
import { TestSchema } from '@dxos/echo/testing';
import { type EchoDatabase } from '@dxos/echo-db';
import { EchoTestBuilder } from '@dxos/echo-db/testing';

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
    await db.flush({ indexes: true });

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
    await db.flush({ indexes: true });

    const ref = Ref.make(targetObj);
    const atom = AtomRef.make(ref);

    // Subscribe to updates.
    let updateCount = 0;
    registry.subscribe(atom, () => updateCount++, { immediate: true });

    expect(updateCount).toBe(1);

    // Mutate target - ref atom does NOT react to this.
    Obj.change(targetObj, (o) => {
      o.name = 'Updated';
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
    await db.flush({ indexes: true });

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
    await db.flush({ indexes: true });

    const ref1 = Ref.make(targetObj1);
    const ref2 = Ref.make(targetObj2);

    const atom1 = AtomRef.make(ref1);
    const atom2 = AtomRef.make(ref2);

    // Different refs should return different atom instances.
    expect(atom1).not.toBe(atom2);
  });

  test('AtomRef.make returns different atoms for refs created separately to same target', async () => {
    await db.graph.schemaRegistry.register([TestSchema.Person]);

    const targetObj = Obj.make(TestSchema.Person, { name: 'Target', username: 'target', email: 'target@example.com' });
    db.add(targetObj);
    await db.flush({ indexes: true });

    // Create two separate refs to the same target.
    const ref1 = Ref.make(targetObj);
    const ref2 = Ref.make(targetObj);

    // Refs are different objects (not referentially equal).
    expect(ref1).not.toBe(ref2);

    const atom1 = AtomRef.make(ref1);
    const atom2 = AtomRef.make(ref2);

    // Different ref objects mean different atoms (keyed by ref reference).
    expect(atom1).not.toBe(atom2);

    // But both atoms should return the same target data.
    expect(registry.get(atom1)?.name).toBe('Target');
    expect(registry.get(atom2)?.name).toBe('Target');
  });

  test('cached ref atoms return same instance after multiple retrievals', async () => {
    await db.graph.schemaRegistry.register([TestSchema.Person]);

    const targetObj = Obj.make(TestSchema.Person, { name: 'Target', username: 'target', email: 'target@example.com' });
    db.add(targetObj);
    await db.flush({ indexes: true });

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
    await db.flush({ indexes: true });

    const ref = Ref.make(targetObj);
    const atom = AtomRef.make(ref);

    const result = registry.get(atom);
    expect(result?.name).toBe('Expando Target');
    expect(result?.value).toBe(42);
  });
});

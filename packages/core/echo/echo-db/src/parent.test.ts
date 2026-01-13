//
// Copyright 2024 DXOS.org
//

import * as Schema from 'effect/Schema';
import { afterEach, beforeEach, describe, expect, test } from 'vitest';

import { Obj, Filter, Query } from '@dxos/echo';
import { TestSchema } from '@dxos/echo/testing';
import { PublicKey } from '@dxos/keys';

import { EchoTestBuilder, createDataAssertion } from './testing/echo-test-builder';

describe('Parent Hierarchy', () => {
  let builder: EchoTestBuilder;

  beforeEach(async () => {
    builder = await new EchoTestBuilder().open();
  });

  afterEach(async () => {
    await builder.close();
  });

  test('parent is persisted and loaded', async () => {
    const [spaceKey] = PublicKey.randomSequence();
    await using peer = await builder.createPeer({ types: [TestSchema.Person] });

    let childId: string;
    let parentId: string;

    {
      await using db = await peer.createDatabase(spaceKey);
      const parent = db.add(Obj.make(TestSchema.Person, { name: 'Parent' }));
      const child = db.add(Obj.make(TestSchema.Person, { name: 'Child' }));

      Obj.setParent(child, parent);
      expect(Obj.getParent(child)).to.eq(parent);

      childId = child.id;
      parentId = parent.id;

      await db.flush();
    }

    await peer.reload();

    {
      await using db = await peer.openLastDatabase();
      const child = (await db.query(Filter.id(childId)).first()) as any;
      expect(child).toBeDefined();
      expect(child.name).to.eq('Child');

      const parent = Obj.getParent(child);
      expect(parent).toBeDefined();
      expect((parent as any).name).to.eq('Parent');
      expect((parent as any).id).to.eq(parentId);
    }
  });

  test('recursive loading of parents', async () => {
    // Grandparent -> Parent -> Child
    // Loading Child should load Parent and Grandparent due to strong dependencies.
    const [spaceKey] = PublicKey.randomSequence();
    await using peer = await builder.createPeer({ types: [TestSchema.Person] });

    let childId: string;

    {
      await using db = await peer.createDatabase(spaceKey);
      const gp = db.add(Obj.make(TestSchema.Person, { name: 'Grandparent' }));
      const p = db.add(Obj.make(TestSchema.Person, { name: 'Parent' }));
      const c = db.add(Obj.make(TestSchema.Person, { name: 'Child' }));

      Obj.setParent(p, gp);
      Obj.setParent(c, p);

      childId = c.id;
      await db.flush();
    }

    await peer.reload();

    {
      await using db = await peer.openLastDatabase();
      // We query ONLY for the child.
      // The database loader should pull in strong dependencies (parents).
      // Note: In Automerge, typically the whole doc is loaded, or at least chunks.
      // Using EchoTestBuilder with shared instance might already meet this, but let's verify availability.

      // If we use `getObjectById` it might require them to be loaded.
      // Query should load the matched object.
      const child = (await db.query(Filter.id(childId)).first()) as any;
      expect(child).toBeDefined();

      const p = Obj.getParent(child);
      expect(p).toBeDefined();
      expect((p as any).name).to.eq('Parent'); // Access properties to ensure loaded

      const gp = Obj.getParent(p as any);
      expect(gp).toBeDefined();
      expect((gp as any).name).to.eq('Grandparent');
    }
  });

  test('cannot un-delete child if parent is deleted', async () => {
    await using peer = await builder.createPeer({ types: [TestSchema.Person] });
    await using db = await peer.createDatabase();
    const parent = db.add(Obj.make(TestSchema.Person, { name: 'Parent' }));
    const child = db.add(Obj.make(TestSchema.Person, { name: 'Child' }));
    Obj.setParent(child, parent);

    Obj.setDeleted(parent, true);
    expect(Obj.isDeleted(child)).toEqual(true);

    expect(() => Obj.setDeleted(child, false)).toThrow();
  });

  test('deleted parent implies deleted child', async () => {
    const [spaceKey] = PublicKey.randomSequence();
    await using peer = await builder.createPeer({ types: [TestSchema.Person] });

    let childId: string;

    {
      await using db = await peer.createDatabase(spaceKey);
      const parent = db.add(Obj.make(TestSchema.Person, { name: 'Parent' }));
      const child = db.add(Obj.make(TestSchema.Person, { name: 'Child' }));

      Obj.setParent(child, parent);
      childId = child.id;

      await db.flush();

      // Delete parent
      db.remove(parent);
      expect(Obj.isDeleted(parent)).to.be.true;

      // Child should be effectively deleted
      expect(Obj.isDeleted(child)).to.be.true;
    }

    await peer.reload();

    {
      await using db = await peer.openLastDatabase();
      const child = (await db.query(Filter.id(childId)).first()) as any;
      // Ideally query shouldn't return deleted objects unless requested.
      // But if we get it by ID?
      // Wait, db.query filters deleted by default?
      // Let's check Obj.isDeleted explicitly.

      // Query explicitly including deleted?
      // Or getObjectById?

      // If query returns it, we check isDeleted.
      // Actually standard query filters out deleted objects.
      // So verify it's NOT in result.
      const queryResult = await db.query(Filter.id(childId)).run();
      expect(queryResult.length).to.eq(0);

      // Get by ID including deleted?
      // getObjectById might return undefined if deleted?
      // Depends on implementation.
    }
  });
});

//
// Copyright 2024 DXOS.org
//

import { afterEach, beforeEach, describe, expect, test } from 'vitest';

import { Filter, Obj } from '@dxos/echo';
import { TestSchema } from '@dxos/echo/testing';
import { PublicKey } from '@dxos/keys';

import { EchoTestBuilder } from './testing/echo-test-builder';
import { invariant } from '@dxos/invariant';

describe('Parent Hierarchy', () => {
  let builder: EchoTestBuilder;

  beforeEach(async () => {
    builder = await new EchoTestBuilder().open();
  });

  afterEach(async () => {
    await builder.close();
  });

  test('create object with Obj.Parent in props (standalone object)', async () => {
    await using peer = await builder.createPeer({ types: [TestSchema.Person, TestSchema.Organization] });
    await using db = await peer.createDatabase();

    const parent = Obj.make(TestSchema.Organization, { name: 'DXOS' });
    const child = Obj.make(TestSchema.Person, {
      [Obj.Parent]: parent,
      name: 'John',
    });

    expect(child.name).toBe('John');
    expect(Obj.getParent(child)).toBe(parent);
  });

  test('create object with Obj.Parent in props (saved to db)', async () => {
    await using peer = await builder.createPeer({ types: [TestSchema.Person, TestSchema.Organization] });
    await using db = await peer.createDatabase();

    const parent = db.add(Obj.make(TestSchema.Organization, { name: 'DXOS' }));
    const child = db.add(
      Obj.make(TestSchema.Person, {
        [Obj.Parent]: parent,
        name: 'John',
      }),
    );

    expect(child.name).toBe('John');
    expect(Obj.getParent(child)).toBe(parent);
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

  test('recursive loading of parents', { timeout: 1000 }, async () => {
    // Grandparent -> Parent -> Child
    // Loading Child should load Parent and Grandparent due to strong dependencies.
    const [spaceKey] = PublicKey.randomSequence();
    await using peer = await builder.createPeer({ types: [TestSchema.Person] });

    let childId: string;

    {
      await using db = await peer.createDatabase(spaceKey);
      const gp = db.add(Obj.make(TestSchema.Person, { name: 'Grandparent' }));
      const p = db.add(Obj.make(TestSchema.Person, { [Obj.Parent]: gp, name: 'Parent' }));
      const c = db.add(Obj.make(TestSchema.Person, { [Obj.Parent]: p, name: 'Child' }));

      childId = c.id;
      await db.flush({ indexes: true });
    }

    await peer.reload();

    {
      await using db = await peer.openLastDatabase();

      const child = await db.query(Filter.id(childId)).first();
      expect(child).toBeDefined();

      const p = Obj.getParent(child);
      expect(p).toBeDefined();
      invariant(Obj.instanceOf(TestSchema.Person, p));
      expect(p.name).to.eq('Parent');

      const gp = Obj.getParent(p);
      expect(gp).toBeDefined();
      invariant(Obj.instanceOf(TestSchema.Person, gp));
      expect(gp.name).to.eq('Grandparent');
    }
  });

  // TODO(dmaretskyi): Currently bugged.
  test.skip('cannot un-delete child if parent is deleted', async () => {
    await using peer = await builder.createPeer({ types: [TestSchema.Person] });
    await using db = await peer.createDatabase();
    const parent = db.add(Obj.make(TestSchema.Person, { name: 'Parent' }));
    const child = db.add(Obj.make(TestSchema.Person, { name: 'Child' }));
    Obj.setParent(child, parent);

    Obj.setDeleted(parent, true);
    expect(Obj.isDeleted(child)).toEqual(true);

    expect(() => Obj.setDeleted(child, false)).toThrow();
  });

  // TODO(dmaretskyi): This test fails because after reloading, the parent object may not be
  // loaded when the query filters objects by `isDeleted()`. The cascade check in `isDeleted()`
  // returns false if the parent ObjectCore isn't loaded yet (getObjectCoreById returns undefined).
  // Need to ensure strong dependencies (parents) are loaded synchronously before isDeleted check.
  test.skip('deleted parent implies deleted child', async () => {
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

      // Delete parent.
      db.remove(parent);
      expect(Obj.isDeleted(parent)).to.be.true;

      // Child should be effectively deleted.
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

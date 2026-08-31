//
// Copyright 2024 DXOS.org
//

import * as Schema from 'effect/Schema';
import { afterEach, beforeEach, describe, expect, test } from 'vitest';

import { Annotation, Filter, Obj, Ref, Type } from '@dxos/echo';
import { EchoTestBuilder } from '@dxos/echo-client/testing';
import { TestSchema } from '@dxos/echo/testing';
import { invariant } from '@dxos/invariant';
import { DXN, PublicKey } from '@dxos/keys';

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

  test('parent is persisted and loaded', { timeout: 30_000 }, async () => {
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

  test('recursive loading of parents', { timeout: 30_000 }, async () => {
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
      await db.flush();
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

  // TODO(dmaretskyi): Currently bugged and I'm not sure if we want to support this.
  test.skip('cannot un-delete child if parent is deleted', async () => {
    await using peer = await builder.createPeer({ types: [TestSchema.Person] });
    await using db = await peer.createDatabase();
    const parent = db.add(Obj.make(TestSchema.Person, { name: 'Parent' }));
    const child = db.add(Obj.make(TestSchema.Person, { name: 'Child' }));
    Obj.setParent(child, parent);

    db.remove(parent);
    expect(Obj.isDeleted(child)).toEqual(true);

    expect(() => db.add(child)).toThrow();
  });

  test('deleted parent implies deleted child', { timeout: 30_000 }, async () => {
    const [spaceKey] = PublicKey.randomSequence();
    await using peer = await builder.createPeer({ types: [TestSchema.Person] });

    let childId: string;

    {
      await using db = await peer.createDatabase(spaceKey);
      const parent = db.add(Obj.make(TestSchema.Person, { name: 'Parent' }));
      const child = db.add(Obj.make(TestSchema.Person, { [Obj.Parent]: parent, name: 'Child' }));
      childId = child.id;

      // Delete parent.
      db.remove(parent);
      expect(Obj.isDeleted(parent)).to.be.true;
      expect(Obj.isDeleted(child)).to.be.true;

      await db.flush();
    }

    await peer.reload();

    {
      await using db = await peer.openLastDatabase();
      const queryResult = await db.query(Filter.id(childId)).run();
      expect(queryResult.length).to.eq(0);
    }
  });
});

describe('Annotation.SetParent', () => {
  class Body extends Type.makeObject<Body>(DXN.make('com.example.type.body', '0.1.0'))(
    Schema.Struct({ text: Schema.String }),
  ) {}

  class Container extends Type.makeObject<Container>(DXN.make('com.example.type.container', '0.1.0'))(
    Schema.Struct({
      /** Owned. */
      body: Schema.optional(Ref.Ref(Body).pipe(Annotation.SetParent.set(true))),
      /** Owned, ordered. */
      sections: Schema.Array(Ref.Ref(Body)).pipe(Annotation.SetParent.set(true)),
      /** Owned, nested inside a plain struct. */
      backend: Schema.optional(Schema.Struct({ config: Ref.Ref(Body).pipe(Annotation.SetParent.set(true)) })),
      /** NOT owned — a plain reference. */
      linked: Schema.optional(Ref.Ref(Body)),
    }),
  ) {}

  let builder: EchoTestBuilder;

  beforeEach(async () => {
    builder = await new EchoTestBuilder().open();
  });

  afterEach(async () => {
    await builder.close();
  });

  test('parent is set on creation', async () => {
    const body = Obj.make(Body, { text: 'body' });
    const section = Obj.make(Body, { text: 'section' });
    const config = Obj.make(Body, { text: 'config' });
    const linked = Obj.make(Body, { text: 'linked' });
    const container = Obj.make(Container, {
      body: Ref.make(body),
      sections: [Ref.make(section)],
      backend: { config: Ref.make(config) },
      linked: Ref.make(linked),
    });

    expect(Obj.getParent(body)?.id).toBe(container.id);
    expect(Obj.getParent(section)?.id).toBe(container.id);
    expect(Obj.getParent(config)?.id).toBe(container.id);
    expect(Obj.getParent(linked)).toBeUndefined();
  });

  test('parent is set on write', async () => {
    const container = Obj.make(Container, { sections: [] });
    const body = Obj.make(Body, { text: 'body' });
    const section = Obj.make(Body, { text: 'section' });
    expect(Obj.getParent(body)).toBeUndefined();

    Obj.update(container, (container) => {
      container.body = Ref.make(body);
      container.sections = [Ref.make(section)];
    });

    expect(Obj.getParent(body)?.id).toBe(container.id);
    expect(Obj.getParent(section)?.id).toBe(container.id);
  });

  test('parent is set on write to a database object', async () => {
    await using peer = await builder.createPeer({ types: [Body, Container] });
    await using db = await peer.createDatabase();

    const container = db.add(Obj.make(Container, { sections: [] }));
    const body = db.add(Obj.make(Body, { text: 'body' }));
    Obj.update(container, (container) => {
      container.body = Ref.make(body);
    });

    expect(Obj.getParent(body)?.id).toBe(container.id);
  });

  test('re-parents when the ref is replaced', async () => {
    const container = Obj.make(Container, { sections: [] });
    const other = Obj.make(Container, { sections: [] });
    const body = Obj.make(Body, { text: 'body' });

    Obj.update(container, (container) => {
      container.body = Ref.make(body);
    });
    expect(Obj.getParent(body)?.id).toBe(container.id);

    Obj.update(other, (other) => {
      other.body = Ref.make(body);
    });
    expect(Obj.getParent(body)?.id).toBe(other.id);
  });

  test('owned child cascade-deletes with its holder', { timeout: 30_000 }, async () => {
    await using peer = await builder.createPeer({ types: [Body, Container] });
    await using db = await peer.createDatabase();

    const body = db.add(Obj.make(Body, { text: 'body' }));
    const container = db.add(Obj.make(Container, { sections: [], body: Ref.make(body) }));
    await db.flush();

    db.remove(container);
    expect(Obj.isDeleted(body)).to.be.true;
  });
});

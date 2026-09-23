//
// Copyright 2026 DXOS.org
//

import * as Schema from 'effect/Schema';
import * as Atom from 'effect/unstable/reactivity/Atom';
import * as AtomRegistry from 'effect/unstable/reactivity/AtomRegistry';
import { afterEach, beforeEach, describe, test } from 'vitest';

import { Annotation, Collection, type Database, DXN, Obj, Ref, Type } from '@dxos/echo';
import { EchoTestBuilder } from '@dxos/echo-client/testing';
import { CollectionItemAnnotation } from '@dxos/schema';

import * as AppNode from './AppNode.ts';

const TYPENAME = 'com.example.type.doc';

const Doc = Type.makeObject(DXN.make(TYPENAME, '0.1.0'))(
  Schema.Struct({ name: Schema.optional(Schema.String) }).pipe(
    Annotation.IconAnnotation.set({ icon: 'ph--text-aa--regular', hue: 'indigo' }),
    CollectionItemAnnotation.set(true),
  ),
);

describe('makeObject', () => {
  let testBuilder: EchoTestBuilder;
  let db: Database.Database;

  beforeEach(async () => {
    testBuilder = await new EchoTestBuilder().open();
    ({ db } = (await testBuilder.createDatabase({ types: [Doc] })) as { db: Database.Database });
  });

  afterEach(async () => {
    await testBuilder.close();
  });

  test('reads the icon annotation from the registered type', async ({ expect }) => {
    const object = db.add(Obj.make(Doc, { name: 'New document' }));
    await db.flush();

    expect(AtomRegistry.make().get(iconAtom(db, object))).toBe('ph--text-aa--regular');
  });

  test('recomputes the icon when the type registers after the node is built', async ({ expect }) => {
    const object = db.add(Obj.make(Doc, { name: 'New document' }));
    await db.flush();

    // Plugin schema modules activate lazily, so a node can be built before its type is registered.
    const type = db.graph.registry
      .list()
      .find((entity) => Type.isType(entity) && Type.getTypename(entity) === TYPENAME);
    expect(type).toBeDefined();
    expect(db.graph.registry.remove(type!.id)).toBe(true);

    const registry = AtomRegistry.make();
    const atom = iconAtom(db, object);
    // Subscribe so the atom stays mounted and observes the registration.
    const unsubscribe = registry.subscribe(atom, () => {});
    expect(registry.get(atom)).toBe('ph--circle-dashed--regular');

    db.graph.registry.add([type!]);
    expect(registry.get(atom)).toBe('ph--text-aa--regular');

    unsubscribe();
  });
});

const iconAtom = (db: Database.Database, object: Obj.Unknown) =>
  Atom.make((get) => AppNode.makeObject({ get, db, object })?.properties.icon);

describe('collection partials: transfer', () => {
  let testBuilder: EchoTestBuilder;
  let db: Database.Database;

  beforeEach(async () => {
    testBuilder = await new EchoTestBuilder().open();
    ({ db } = (await testBuilder.createDatabase({ types: [Collection.Collection, Doc] })) as {
      db: Database.Database;
    });
  });

  afterEach(async () => {
    await testBuilder.close();
  });

  const drop = (doc: Obj.Unknown, from: Collection.Collection, to: Collection.Collection) => {
    const node = { data: doc } as any;
    AppNode.buildCollectionPartials(from, db).onTransferEnd(node);
    AppNode.buildCollectionPartials(to, db).onTransferStart(node);
  };

  test('dragging between collections re-parents the object', async ({ expect }) => {
    const doc = db.add(Obj.make(Doc, { name: 'doc' }));
    const from = db.add(Collection.make({ objects: [Ref.make(doc)] }));
    const to = db.add(Collection.make({ objects: [] }));
    await db.flush();
    expect(Obj.getParent(doc)?.id).toBe(from.id);

    drop(doc, from, to);
    await db.flush();

    expect(Obj.getParent(doc)?.id).toBe(to.id);
    expect(from.objects).toHaveLength(0);
    expect(to.objects).toHaveLength(1);
  });

  test('dragging a linked object moves the link and leaves ownership where it is', async ({ expect }) => {
    const doc = db.add(Obj.make(Doc, { name: 'doc' }));
    const owner = db.add(Collection.make({ objects: [Ref.make(doc)] }));
    const linked = db.add(Collection.make({ objects: [] }));
    Obj.update(linked, (linked) => {
      linked.objects.push(Ref.make(doc));
    });
    const to = db.add(Collection.make({ objects: [] }));
    await db.flush();

    drop(doc, linked, to);
    await db.flush();

    expect(Obj.getParent(doc)?.id).toBe(owner.id);
    expect(linked.objects).toHaveLength(0);
    expect(to.objects).toHaveLength(1);
  });
});

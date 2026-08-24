//
// Copyright 2026 DXOS.org
//

import * as Schema from 'effect/Schema';
import * as Atom from 'effect/unstable/reactivity/Atom';
import * as AtomRegistry from 'effect/unstable/reactivity/AtomRegistry';
import { afterEach, beforeEach, describe, test } from 'vitest';

import { Annotation, type Database, DXN, Obj, Type } from '@dxos/echo';
import { EchoTestBuilder } from '@dxos/echo-client/testing';

import * as AppNode from './AppNode';

const TYPENAME = 'com.example.type.doc';

const Doc = Type.makeObject(DXN.make(TYPENAME, '0.1.0'))(
  Schema.Struct({ name: Schema.optional(Schema.String) }).pipe(
    Annotation.IconAnnotation.set({ icon: 'ph--text-aa--regular', hue: 'indigo' }),
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

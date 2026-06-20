//
// Copyright 2024 DXOS.org
//

import * as Schema from 'effect/Schema';
import { afterEach, beforeEach, expect, test } from 'vitest';

import { Filter, Obj, Type } from '@dxos/echo';
import { SchemaEx } from '@dxos/effect';
import { DXN } from '@dxos/keys';

import { EchoTestBuilder } from '../testing';
import { defineObjectMigration } from './object-migration';

let builder: EchoTestBuilder;

beforeEach(async () => {
  builder = await new EchoTestBuilder().open();
});

afterEach(async () => {
  await builder.close();
});

const ContactV1 = Schema.Struct({
  firstName: Schema.String,
  lastName: Schema.String,
}).pipe(Type.makeObject(DXN.make('com.example.type.person', '0.1.0')));

const ContactV2 = Schema.Struct({
  name: Schema.String,
}).pipe(Type.makeObject(DXN.make('com.example.type.person', '0.2.0')));

const ContactV3 = Schema.Struct({
  name: Schema.String,
  email: Schema.String,
}).pipe(Type.makeObject(DXN.make('com.example.type.person', '0.3.0')));

const migrationV2 = defineObjectMigration({
  from: ContactV1,
  to: ContactV2,
  transform: async (from) => {
    return { name: `${from.firstName} ${from.lastName}` };
  },
  onMigration: async () => {},
});

const migrationV3 = defineObjectMigration({
  from: ContactV2,
  to: ContactV3,
  transform: async (from) => {
    return { ...from, email: `${from.name.toLocaleLowerCase().replaceAll(' ', '.')}@example.com` };
  },
  onMigration: async () => {},
});

test('migrate 1 object', async () => {
  const { db, graph } = await builder.createDatabase();
  graph.registry.add([ContactV1, ContactV2]);

  db.add(Obj.make(ContactV1, { firstName: 'John', lastName: 'Doe' }));
  await db.flush();
  await db.runMigrations([migrationV2]);

  const objects = await db.query(Filter.type(ContactV2)).run();
  expect(objects).to.have.length(1);

  expect(Type.getURI(Obj.getType(objects[0])!)?.toString()).to.eq(DXN.make('com.example.type.person', '0.2.0'));
  expect(Obj.getTypename(objects[0])).to.eq('com.example.type.person');
  expect(Type.getVersion(Obj.getType(objects[0])!)).to.eq('0.2.0');
  expect(objects[0].name).to.eq('John Doe');
});

test('incrementally migrates new objects', async () => {
  const { db, graph } = await builder.createDatabase();
  graph.registry.add([ContactV1, ContactV2]);

  db.add(Obj.make(ContactV1, { firstName: 'John', lastName: 'Doe' }));
  await db.flush();
  await db.runMigrations([migrationV2]);

  {
    const objects = await db.query(Filter.type(ContactV2)).run();
    expect(objects).to.have.length(1);
    expect(objects[0].name).to.eq('John Doe');
  }

  db.add(Obj.make(ContactV1, { firstName: 'Jane', lastName: 'Smith' }));
  await db.flush();
  await db.runMigrations([migrationV2]);

  {
    const objects = await db.query(Filter.type(ContactV2)).run();
    expect(objects).to.have.length(2);
    expect(objects[0].name).to.eq('John Doe');
    expect(objects[1].name).to.eq('Jane Smith');
  }

  await db.runMigrations([migrationV2]);

  {
    const objects = await db.query(Filter.type(ContactV2)).run();
    expect(objects).to.have.length(2);
    expect(objects[0].name).to.eq('John Doe');
    expect(objects[1].name).to.eq('Jane Smith');
  }
});

test('migration moves data key/version into meta', async () => {
  const RegistryEntryV1 = Schema.Struct({
    key: Schema.String,
    name: Schema.String,
    version: Schema.String,
  }).pipe(Type.makeObject(DXN.make('com.example.type.registryEntry', '0.1.0')));

  const RegistryEntryV2 = Schema.Struct({
    name: Schema.String,
  }).pipe(Type.makeObject(DXN.make('com.example.type.registryEntry', '0.2.0')));

  const migration = defineObjectMigration({
    from: RegistryEntryV1,
    to: RegistryEntryV2,
    transform: async (from) => ({
      [Obj.Meta]: { key: from.key, version: from.version },
      name: from.name,
    }),
  });

  const { db, graph } = await builder.createDatabase();
  graph.registry.add([RegistryEntryV1, RegistryEntryV2]);

  db.add(
    Obj.make(RegistryEntryV1, {
      key: 'org.example.type.foo',
      name: 'foo',
      version: '1.2.3',
    }),
  );
  await db.flush();
  await db.runMigrations([migration]);

  const objects = await db.query(Filter.type(RegistryEntryV2)).run();
  expect(objects).to.have.length(1);
  expect(objects[0].name).to.eq('foo');
  expect(Obj.getMeta(objects[0]).key).to.eq('org.example.type.foo');
  expect(Obj.getMeta(objects[0]).version).to.eq('1.2.3');

  // The migrated object should be queryable by its meta key.
  const byKey = await db.query(Filter.and(Filter.type(RegistryEntryV2), Filter.key('org.example.type.foo'))).run();
  expect(byKey).to.have.length(1);

  // And by semver range.
  const byRange = await db
    .query(Filter.and(Filter.type(RegistryEntryV2), Filter.key('org.example.type.foo', { version: '^1.0.0' })))
    .run();
  expect(byRange).to.have.length(1);
});

test('chained migrations', async () => {
  const { db, graph } = await builder.createDatabase();
  graph.registry.add([ContactV1, ContactV2, ContactV3]);

  db.add(Obj.make(ContactV1, { firstName: 'John', lastName: 'Doe' }));
  await db.flush();
  await db.runMigrations([migrationV2, migrationV3]);

  const objects = await db.query(Filter.type(ContactV3)).run();
  expect(objects).to.have.length(1);
  expect(Obj.getTypename(objects[0])).to.eq('com.example.type.person');
  expect(Type.getVersion(Obj.getType(objects[0])!)).to.eq('0.3.0');
  expect(objects[0].name).to.eq('John Doe');
  expect(objects[0].email).to.eq('john.doe@example.com');
});

// TODO(wittjosiah): Strip down to minimal example. Key thing this is testing is arrays.
// test('view migration', async () => {
//   const { db, graph } = await builder.createDatabase();
//   db.add(ViewTypeV1);
//   db.add(ViewTypeV2);

//   db.add(
//     Obj.make(ViewTypeV1, {
//       fields: [
//         { id: '8cb60541', path: 'name' as SchemaEx.JsonPath },
//         { id: '902dd8b5', path: 'email' as SchemaEx.JsonPath },
//         { id: 'e288952b', path: 'salary' as SchemaEx.JsonPath, size: 150 },
//         { id: 'cbdc987c', path: 'active' as SchemaEx.JsonPath, size: 100 },
//         { id: '922fd882', path: 'manager' as SchemaEx.JsonPath, referencePath: 'name' as SchemaEx.JsonPath },
//       ],
//       name: 'View',
//       query: { type: 'com.example.type.b1e66ff8' },
//     }),
//   );
//   await db.flush();
//   await db.runMigrations([ViewTypeV1ToV2]);

//   const objects = await db.query(Filter.type(ViewTypeV2)).run();
//   expect(objects).to.have.length(1);
// });

export const FieldSchema = Schema.Struct({
  id: Schema.String,
  path: SchemaEx.JsonPath,
  visible: Schema.optional(Schema.Boolean),
  size: Schema.optional(Schema.Number),
  referencePath: Schema.optional(SchemaEx.JsonPath),
});

export type FieldType = Schema.Schema.Type<typeof FieldSchema>;

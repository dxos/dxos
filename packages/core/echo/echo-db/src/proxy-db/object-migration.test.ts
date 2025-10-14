//
// Copyright 2024 DXOS.org
//

import * as Schema from 'effect/Schema';
import { afterEach, beforeEach, expect, test } from 'vitest';

import { JsonPath, TypedObject, getSchema, getSchemaDXN, getSchemaVersion, getTypename } from '@dxos/echo-schema';
import { DXN } from '@dxos/keys';
import { live } from '@dxos/live-object';

import { Filter } from '../query';
import { EchoTestBuilder } from '../testing';

import { defineObjectMigration } from './object-migration';

let builder: EchoTestBuilder;

beforeEach(async () => {
  builder = await new EchoTestBuilder().open();
});

afterEach(async () => {
  await builder.close();
});

class ContactV1 extends TypedObject({ typename: 'example.com/type/Contact', version: '0.1.0' })({
  firstName: Schema.String,
  lastName: Schema.String,
}) {}

class ContactV2 extends TypedObject({ typename: 'example.com/type/Contact', version: '0.2.0' })({
  name: Schema.String,
}) {}

class ContactV3 extends TypedObject({ typename: 'example.com/type/Contact', version: '0.3.0' })({
  name: Schema.String,
  email: Schema.String,
}) {}

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
  graph.schemaRegistry.addSchema([ContactV1, ContactV2]);

  db.add(live(ContactV1, { firstName: 'John', lastName: 'Doe' }));
  await db.flush({ indexes: true });
  await db.runMigrations([migrationV2]);

  const { objects } = await db.query(Filter.type(ContactV2)).run();
  expect(objects).to.have.length(1);

  expect(getSchemaDXN(getSchema(objects[0])!)?.toString()).to.eq(
    DXN.fromTypenameAndVersion('example.com/type/Contact', '0.2.0').toString(),
  );
  expect(getTypename(objects[0])).to.eq('example.com/type/Contact');
  expect(getSchemaVersion(getSchema(objects[0])!)).to.eq('0.2.0');
  expect(objects[0].name).to.eq('John Doe');
});

test('incrementally migrates new objects', async () => {
  const { db, graph } = await builder.createDatabase();
  graph.schemaRegistry.addSchema([ContactV1, ContactV2]);

  db.add(live(ContactV1, { firstName: 'John', lastName: 'Doe' }));
  await db.flush({ indexes: true });
  await db.runMigrations([migrationV2]);

  {
    const { objects } = await db.query(Filter.type(ContactV2)).run();
    expect(objects).to.have.length(1);
    expect(objects[0].name).to.eq('John Doe');
  }

  db.add(live(ContactV1, { firstName: 'Jane', lastName: 'Smith' }));
  await db.flush({ indexes: true });
  await db.runMigrations([migrationV2]);

  {
    const { objects } = await db.query(Filter.type(ContactV2)).run();
    expect(objects).to.have.length(2);
    expect(objects[0].name).to.eq('John Doe');
    expect(objects[1].name).to.eq('Jane Smith');
  }

  await db.runMigrations([migrationV2]);

  {
    const { objects } = await db.query(Filter.type(ContactV2)).run();
    expect(objects).to.have.length(2);
    expect(objects[0].name).to.eq('John Doe');
    expect(objects[1].name).to.eq('Jane Smith');
  }
});

test('chained migrations', async () => {
  const { db, graph } = await builder.createDatabase();
  graph.schemaRegistry.addSchema([ContactV1, ContactV2, ContactV3]);

  db.add(live(ContactV1, { firstName: 'John', lastName: 'Doe' }));
  await db.flush({ indexes: true });
  await db.runMigrations([migrationV2, migrationV3]);

  const { objects } = await db.query(Filter.type(ContactV3)).run();
  expect(objects).to.have.length(1);
  expect(getTypename(objects[0])).to.eq('example.com/type/Contact');
  expect(getSchemaVersion(getSchema(objects[0])!)).to.eq('0.3.0');
  expect(objects[0].name).to.eq('John Doe');
  expect(objects[0].email).to.eq('john.doe@example.com');
});

// TODO(wittjosiah): Strip down to minimal example. Key thing this is testing is arrays.
// test('view migration', async () => {
//   const { db, graph } = await builder.createDatabase();
//   graph.schemaRegistry.addSchema([ViewTypeV1, ViewTypeV2]);

//   db.add(
//     live(ViewTypeV1, {
//       fields: [
//         { id: '8cb60541', path: 'name' as JsonPath },
//         { id: '902dd8b5', path: 'email' as JsonPath },
//         { id: 'e288952b', path: 'salary' as JsonPath, size: 150 },
//         { id: 'cbdc987c', path: 'active' as JsonPath, size: 100 },
//         { id: '922fd882', path: 'manager' as JsonPath, referencePath: 'name' as JsonPath },
//       ],
//       name: 'View',
//       query: { type: 'example.com/type/b1e66ff8' },
//     }),
//   );
//   await db.flush({ indexes: true });
//   await db.runMigrations([ViewTypeV1ToV2]);

//   const { objects } = await db.query(Filter.type(ViewTypeV2)).run();
//   expect(objects).to.have.length(1);
// });

export const FieldSchema = Schema.Struct({
  id: Schema.String,
  path: JsonPath,
  visible: Schema.optional(Schema.Boolean),
  size: Schema.optional(Schema.Number),
  referencePath: Schema.optional(JsonPath),
}).pipe(Schema.mutable);

export type FieldType = Schema.Schema.Type<typeof FieldSchema>;

//
// Copyright 2024 DXOS.org
//

import { afterEach, beforeEach, expect, test } from 'vitest';

import {
  AST,
  FieldSortType,
  getSchemaDXN,
  getSchemaVersion,
  getTypename,
  JsonPath,
  JsonSchemaType,
  QueryType,
  S,
  TypedObject,
} from '@dxos/echo-schema';
import { DXN } from '@dxos/keys';
import { getSchema } from '@dxos/echo-schema';
import { live } from '@dxos/live-object';

import { defineObjectMigration } from './object-migration';
import { Filter } from '../query';
import { EchoTestBuilder } from '../testing';

let builder: EchoTestBuilder;

beforeEach(async () => {
  builder = await new EchoTestBuilder().open();
});

afterEach(async () => {
  await builder.close();
});

class ContactV1 extends TypedObject({ typename: 'example.com/type/Contact', version: '0.1.0' })({
  firstName: S.String,
  lastName: S.String,
}) {}

class ContactV2 extends TypedObject({ typename: 'example.com/type/Contact', version: '0.2.0' })({
  name: S.String,
}) {}

class ContactV3 extends TypedObject({ typename: 'example.com/type/Contact', version: '0.3.0' })({
  name: S.String,
  email: S.String,
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

  const { objects } = await db.query(Filter.schema(ContactV2)).run();
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
    const { objects } = await db.query(Filter.schema(ContactV2)).run();
    expect(objects).to.have.length(1);
    expect(objects[0].name).to.eq('John Doe');
  }

  db.add(live(ContactV1, { firstName: 'Jane', lastName: 'Smith' }));
  await db.flush({ indexes: true });
  await db.runMigrations([migrationV2]);

  {
    const { objects } = await db.query(Filter.schema(ContactV2)).run();
    expect(objects).to.have.length(2);
    expect(objects[0].name).to.eq('John Doe');
    expect(objects[1].name).to.eq('Jane Smith');
  }

  await db.runMigrations([migrationV2]);

  {
    const { objects } = await db.query(Filter.schema(ContactV2)).run();
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

  const { objects } = await db.query(Filter.schema(ContactV3)).run();
  expect(objects).to.have.length(1);
  expect(getTypename(objects[0])).to.eq('example.com/type/Contact');
  expect(getSchemaVersion(getSchema(objects[0])!)).to.eq('0.3.0');
  expect(objects[0].name).to.eq('John Doe');
  expect(objects[0].email).to.eq('john.doe@example.com');
});

// TODO(wittjosiah): Strip down to minimal example. Key thing this is testing is arrays.
test('view migration', async () => {
  const { db, graph } = await builder.createDatabase();
  graph.schemaRegistry.addSchema([ViewTypeV1, ViewTypeV2]);

  db.add(
    live(ViewTypeV1, {
      fields: [
        { id: '8cb60541', path: 'name' as JsonPath },
        { id: '902dd8b5', path: 'email' as JsonPath },
        { id: 'e288952b', path: 'salary' as JsonPath, size: 150 },
        { id: 'cbdc987c', path: 'active' as JsonPath, size: 100 },
        { id: '922fd882', path: 'manager' as JsonPath, referencePath: 'name' as JsonPath },
      ],
      name: 'View',
      query: { type: 'example.com/type/b1e66ff8' },
    }),
  );
  await db.flush({ indexes: true });
  await db.runMigrations([ViewTypeV1ToV2]);

  const { objects } = await db.query(Filter.schema(ViewTypeV2)).run();
  expect(objects).to.have.length(1);
});

export const FieldSchema = S.Struct({
  id: S.String,
  path: JsonPath,
  visible: S.optional(S.Boolean),
  size: S.optional(S.Number),
  referencePath: S.optional(JsonPath),
}).pipe(S.mutable);

export type FieldType = S.Schema.Type<typeof FieldSchema>;

export class ViewTypeV1 extends TypedObject({
  typename: 'dxos.org/type/View',
  version: '0.1.0',
})({
  name: S.String.annotations({
    [AST.TitleAnnotationId]: 'Name',
    [AST.ExamplesAnnotationId]: ['Contact'],
  }),
  query: S.Struct({
    type: S.optional(S.String),
    sort: S.optional(S.Array(FieldSortType)),
  }).pipe(S.mutable),
  schema: S.optional(JsonSchemaType),
  fields: S.mutable(S.Array(FieldSchema)),
  metadata: S.optional(S.Record({ key: S.String, value: S.Any }).pipe(S.mutable)),
}) {}

export class ViewTypeV2 extends TypedObject({
  typename: 'dxos.org/type/View',
  version: '0.2.0',
})({
  name: S.String.annotations({
    [AST.TitleAnnotationId]: 'Name',
    [AST.ExamplesAnnotationId]: ['Contact'],
  }),
  query: QueryType,
  schema: S.optional(JsonSchemaType),
  fields: S.mutable(S.Array(FieldSchema)),
  metadata: S.optional(S.Record({ key: S.String, value: S.Any }).pipe(S.mutable)),
}) {}

export const ViewTypeV1ToV2 = defineObjectMigration({
  from: ViewTypeV1,
  to: ViewTypeV2,
  transform: async (from) => {
    return { ...from, query: { typename: from.query.type } };
  },
  onMigration: async () => {},
});

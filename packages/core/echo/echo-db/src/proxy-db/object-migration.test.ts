import { afterEach, beforeEach, describe, expect, test } from 'vitest';
import { EchoTestBuilder } from '../testing';
import { getSchemaDXN, getSchemaVersion, getTypename, S, TypedObject } from '@dxos/echo-schema';
import { defineObjectMigration } from './object-migration';
import { create, getSchema, getSnapshot } from '@dxos/live-object';
import { Filter } from '../query';
import { DXN } from '@dxos/keys';
import { log } from '@dxos/log';
import { getObjectDocument } from '../echo-handler/echo-handler';

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

  db.add(create(ContactV1, { firstName: 'John', lastName: 'Doe' }));
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

  db.add(create(ContactV1, { firstName: 'John', lastName: 'Doe' }));
  await db.flush({ indexes: true });
  await db.runMigrations([migrationV2]);

  {
    const { objects } = await db.query(Filter.schema(ContactV2)).run();
    expect(objects).to.have.length(1);
    expect(objects[0].name).to.eq('John Doe');
  }

  db.add(create(ContactV1, { firstName: 'Jane', lastName: 'Smith' }));
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

  db.add(create(ContactV1, { firstName: 'John', lastName: 'Doe' }));
  await db.flush({ indexes: true });
  await db.runMigrations([migrationV2, migrationV3]);

  const { objects } = await db.query(Filter.schema(ContactV3)).run();
  expect(objects).to.have.length(1);
  expect(getTypename(objects[0])).to.eq('example.com/type/Contact');
  expect(getSchemaVersion(getSchema(objects[0])!)).to.eq('0.3.0');
  expect(objects[0].name).to.eq('John Doe');
  expect(objects[0].email).to.eq('john.doe@example.com');
});

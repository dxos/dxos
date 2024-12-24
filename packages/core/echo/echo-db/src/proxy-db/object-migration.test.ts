import { afterEach, beforeEach, describe, expect, test } from 'vitest';
import { EchoTestBuilder } from '../testing';
import { S, TypedObject } from '@dxos/echo-schema';
import { defineObjectMigration } from './object-migration';
import { create } from '@dxos/live-object';

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

const migration = defineObjectMigration({
  from: ContactV1,
  to: ContactV2,
  transform: async (from) => {
    return { name: `${from.firstName} ${from.lastName}` };
  },
  onMigration: async () => {},
});

test('migrate 1 object', async () => {
  const { db, graph } = await builder.createDatabase();
  graph.schemaRegistry.addSchema([ContactV1, ContactV2]);

  db.add(create(ContactV1, { firstName: 'John', lastName: 'Doe' }));
  await db.flush({ indexes: true });
  await db.runMigrations([migration]);

  const { objects } = await db.query().run();
  expect(objects).to.have.length(1);
  expect(objects[0].name).to.eq('John Doe');
});

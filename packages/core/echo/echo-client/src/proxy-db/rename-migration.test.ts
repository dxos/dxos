//
// Copyright 2026 DXOS.org
//

import * as Schema from 'effect/Schema';
import { afterEach, beforeEach, expect, test } from 'vitest';

import { Filter, Migration, Obj, Ref, Type } from '@dxos/echo';
import { DXN } from '@dxos/keys';

import { EchoTestBuilder } from '../testing';

let builder: EchoTestBuilder;

beforeEach(async () => {
  builder = await new EchoTestBuilder().open();
});

afterEach(async () => {
  await builder.close();
});

const Operation = Type.makeObject(DXN.make('com.example.type.operation', '0.1.0'))(
  Schema.Struct({
    name: Schema.String,
  }),
);

const Trigger = Type.makeObject(DXN.make('com.example.type.trigger', '0.1.0'))(
  Schema.Struct({
    runnable: Ref.Ref(Operation),
    steps: Schema.Array(Ref.Ref(Operation)),
    nested: Schema.Struct({ runnable: Ref.Ref(Operation) }),
  }),
);

const FOO = DXN.make('org.example.operation.foo');
const BAR = DXN.make('org.example.operation.bar');
const OTHER = DXN.make('org.example.operation.other');

const rename = Migration.defineRename({
  from: 'org.example.operation.foo',
  to: 'org.example.operation.bar',
});

const makeTrigger = () =>
  Obj.make(Trigger, {
    runnable: Ref.fromURI(FOO),
    steps: [Ref.fromURI(FOO), Ref.fromURI(OTHER)],
    nested: { runnable: Ref.fromURI(DXN.make('org.example.operation.foo', '1.0.0')) },
  });

test('defineRename produces a migration', () => {
  expect(Migration.isMigration(rename)).to.be.true;
  expect(rename.kind).to.eq('rename');
  expect(rename.from).to.eq('dxn:org.example.operation.foo');
  expect(rename.to).to.eq('dxn:org.example.operation.bar');
});

test('object migrations are migrations too', () => {
  const migration = Migration.define({
    from: Operation,
    to: Operation,
    transform: async (from) => ({ name: from.name }),
  });
  expect(Migration.isMigration(migration)).to.be.true;
  expect(migration.kind).to.eq('object');
  expect(Migration.isMigration({})).to.be.false;
});

test('repoints references to the new name', async () => {
  const { db, graph } = await builder.createDatabase();
  graph.registry.add([Operation, Trigger]);

  db.add(makeTrigger());
  await db.flush();
  await db.runMigrations([rename]);

  const [trigger] = await db.query(Filter.type(Trigger)).run();
  expect(trigger.runnable.uri).to.eq(BAR);
  expect(trigger.steps.map((step) => step.uri)).to.deep.eq([BAR, OTHER]);
  // The version suffix survives the rename.
  expect(trigger.nested.runnable.uri).to.eq('dxn:org.example.operation.bar:1.0.0');
});

test('is idempotent', async () => {
  const { db, graph } = await builder.createDatabase();
  graph.registry.add([Operation, Trigger]);

  db.add(makeTrigger());
  await db.flush();
  await db.runMigrations([rename]);
  await db.runMigrations([rename]);

  const [trigger] = await db.query(Filter.type(Trigger)).run();
  expect(trigger.runnable.uri).to.eq(BAR);
  expect(trigger.steps.map((step) => step.uri)).to.deep.eq([BAR, OTHER]);
});

test('leaves entity references untouched', async () => {
  const { db, graph } = await builder.createDatabase();
  graph.registry.add([Operation, Trigger]);

  const operation = db.add(Obj.make(Operation, { name: 'test' }));
  const trigger = db.add(
    Obj.make(Trigger, {
      runnable: Ref.make(operation),
      steps: [],
      nested: { runnable: Ref.fromURI(FOO) },
    }),
  );
  await db.flush();
  await db.runMigrations([rename]);

  expect(trigger.runnable.uri).to.eq(Ref.make(operation).uri);
  expect(trigger.nested.runnable.uri).to.eq(BAR);
});

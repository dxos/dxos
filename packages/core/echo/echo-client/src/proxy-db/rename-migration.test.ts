//
// Copyright 2026 DXOS.org
//

import * as A from '@automerge/automerge';
import * as Schema from 'effect/Schema';
import { afterEach, beforeEach, describe, expect, test } from 'vitest';

import { Filter, Migration, Obj, Ref, Type } from '@dxos/echo';
import { invariant } from '@dxos/invariant';
import { DXN } from '@dxos/keys';

import { getObjectCore } from '../echo-handler';
import { EchoTestBuilder } from '../testing';

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

describe('rename migration', () => {
  let builder: EchoTestBuilder;

  beforeEach(async () => {
    builder = await new EchoTestBuilder().open();
  });

  afterEach(async () => {
    await builder.close();
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
  });

  test('isMigration rejects unbranded and unknown-kind values', () => {
    expect(Migration.isMigration({})).to.be.false;
    expect(Migration.isMigration({ [Migration.TypeId]: Migration.TypeId, kind: 'other' })).to.be.false;
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
    expect(trigger.nested.runnable.uri).to.eq('dxn:org.example.operation.bar:1.0.0');
  });

  test('is idempotent', async () => {
    const { db, graph } = await builder.createDatabase();
    graph.registry.add([Operation, Trigger]);

    const trigger = db.add(makeTrigger());
    await db.flush();
    await db.runMigrations([rename]);
    await db.runMigrations([rename]);

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

  test('resolves through the index on a client with an empty working set', async () => {
    // A fresh client holds no loaded cores, so the reverse-reference index is the only thing that
    // can find the referencing object.
    const { db, graph, peer, key } = await builder.createDatabase();
    graph.registry.add([Operation, Trigger]);

    const triggerId = db.add(makeTrigger()).id;
    await db.flush();

    const client = await peer.createClient();
    await client.graph.registry.add([Operation, Trigger]);
    const reopened = await peer.openDatabase(key, undefined, { client });

    await reopened.runMigrations([rename]);

    const [trigger] = await reopened.query(Filter.type(Trigger)).run();
    expect(trigger.id).to.eq(triggerId);
    expect(trigger.runnable.uri).to.eq(BAR);
    expect(trigger.steps.map((step) => step.uri)).to.deep.eq([BAR, OTHER]);
    expect(trigger.nested.runnable.uri).to.eq('dxn:org.example.operation.bar:1.0.0');
  });

  test('a rename to the same name is a no-op', async () => {
    const { db, graph } = await builder.createDatabase();
    graph.registry.add([Operation, Trigger]);

    const trigger = db.add(makeTrigger());
    await db.flush();

    const settled = documentHeads(trigger);
    await db.runMigrations([
      Migration.defineRename({ from: 'org.example.operation.foo', to: 'org.example.operation.foo' }),
    ]);
    expect(documentHeads(trigger)).to.deep.eq(settled);

    expect(trigger.runnable.uri).to.eq(FOO);
    expect(trigger.steps.map((step) => step.uri)).to.deep.eq([FOO, OTHER]);
  });

  test('rejects an unrecognized migration before applying any of the batch', async () => {
    const { db, graph } = await builder.createDatabase();
    graph.registry.add([Operation, Trigger]);

    const trigger = db.add(makeTrigger());
    await db.flush();

    const settled = documentHeads(trigger);
    await expect(
      // @ts-expect-error intentional type violation to exercise runtime validation.
      db.runMigrations([rename, { [Migration.TypeId]: Migration.TypeId, kind: 'other' }]),
    ).rejects.toThrow(/Unknown migration kind/);

    expect(documentHeads(trigger)).to.deep.eq(settled);
    expect(trigger.runnable.uri).to.eq(FOO);
  });
});

const documentHeads = (object: Obj.Unknown) => {
  const { docHandle } = getObjectCore(object);
  invariant(docHandle, 'Object has no docHandle.');
  return A.getHeads(docHandle.doc());
};

const makeTrigger = () =>
  Obj.make(Trigger, {
    runnable: Ref.fromURI(FOO),
    steps: [Ref.fromURI(FOO), Ref.fromURI(OTHER)],
    nested: { runnable: Ref.fromURI(DXN.make('org.example.operation.foo', '1.0.0')) },
  });

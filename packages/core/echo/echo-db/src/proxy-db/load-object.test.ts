//
// Copyright 2024 DXOS.org
//

import * as Schema from 'effect/Schema';
import { describe, expect, test } from 'vitest';

import { Filter } from '@dxos/echo';
import { Expando, Ref, TypedObject } from '@dxos/echo-schema';
import { PublicKey } from '@dxos/keys';
import { createTestLevel } from '@dxos/kv-store/testing';
import { live } from '@dxos/live-object';
import { openAndClose } from '@dxos/test-utils';

import { type AnyLiveObject } from '../echo-handler';
import { EchoTestBuilder, createTmpPath } from '../testing';

import { loadObjectReferences } from './load-object';

// TODO(dmaretskyi): Refactor to test Ref.load() instead.
describe.skip('loadObjectReferences', () => {
  test('loads a field', async () => {
    const nestedValue = 'test';
    const testBuilder = new EchoTestBuilder();
    await openAndClose(testBuilder);
    const tmpPath = createTmpPath();
    const spaceKey = PublicKey.random();

    const testPeer = await testBuilder.createPeer({ kv: createTestLevel(tmpPath) });
    const db = await testPeer.createDatabase(spaceKey);
    const object = createExpando({ nested: createExpando({ value: nestedValue }) });
    db.add(object);
    await db.flush();
    await testPeer.close();

    const restartedPeer = await testBuilder.createPeer({ kv: createTestLevel(tmpPath) });
    const restartedDb = await restartedPeer.openDatabase(spaceKey, db.rootUrl!);
    const loaded: any = await restartedDb.query(Filter.ids(object.id)).first();
    expect(loaded.nested?.value).to.be.undefined;
    expect(await loadObjectReferences(loaded, (o) => o.nested?.value)).to.eq(nestedValue);
  });

  test('loads multiple fields', async () => {
    const testBuilder = new EchoTestBuilder();
    await openAndClose(testBuilder);
    const tmpPath = createTmpPath();
    const spaceKey = PublicKey.random();

    const testPeer = await testBuilder.createPeer({ kv: createTestLevel(tmpPath) });
    const db = await testPeer.createDatabase(spaceKey);
    const object = createExpando({ foo: createExpando({ value: 1 }), bar: createExpando({ value: 2 }) });
    db.add(object);
    await db.flush();
    await testPeer.close();

    const restartedPeer = await testBuilder.createPeer({ kv: createTestLevel(tmpPath) });
    const restartedDb = await restartedPeer.openDatabase(spaceKey, db.rootUrl!);
    const loaded: any = await restartedDb.query(Filter.ids(object.id)).first();
    expect(loaded.nested?.value).to.be.undefined;
    const [foo, bar] = await loadObjectReferences(loaded, (o) => [o.foo, o.bar] as any[]);
    expect(foo.value + bar.value).to.eq(3);
  });

  test('loads array', async () => {
    const testBuilder = new EchoTestBuilder();
    await openAndClose(testBuilder);
    const tmpPath = createTmpPath();
    const spaceKey = PublicKey.random();

    const testPeer = await testBuilder.createPeer({ kv: createTestLevel(tmpPath) });
    const db = await testPeer.createDatabase(spaceKey);
    const object = createExpando({ nestedArray: [createExpando(), createExpando()] });
    db.add(object);
    await db.flush();
    await testPeer.close();

    const restartedPeer = await testBuilder.createPeer({ kv: createTestLevel(tmpPath) });
    const restartedDb = await restartedPeer.openDatabase(spaceKey, db.rootUrl!);
    const loaded: any = await restartedDb.query(Filter.ids(object.id)).first();
    expect((loaded.nestedArray as any[]).every((v) => v == null)).to.be.true;
    const loadedArray = await loadObjectReferences(loaded, (o) => o.nestedArray as any[]);
    expect(loadedArray.every((v) => v != null)).to.be.true;
  });

  test('loads on multiple objects', async () => {
    const testBuilder = new EchoTestBuilder();
    await openAndClose(testBuilder);
    const tmpPath = createTmpPath();
    const spaceKey = PublicKey.random();

    const testPeer = await testBuilder.createPeer({ kv: createTestLevel(tmpPath) });
    const objects = [
      createExpando({ nestedArray: [createExpando(), createExpando()] }),
      createExpando({ nestedArray: [createExpando(), createExpando(), createExpando()] }),
    ];
    const db = await testPeer.createDatabase(spaceKey);
    objects.forEach((o) => db.add(o));
    await db.flush();
    await testPeer.close();

    const restartedPeer = await testBuilder.createPeer({ kv: createTestLevel(tmpPath) });
    const restartedDb = await restartedPeer.openDatabase(spaceKey, db.rootUrl!);
    const loaded: any[] = await Promise.all(objects.map((o) => restartedDb.query(Filter.ids(o.id)).first()));
    const loadedArrays = await loadObjectReferences(loaded, (o) => o.nestedArray as any[]);
    const mergedArrays = loadedArrays.flatMap((v) => v);
    expect(mergedArrays.length).to.eq(objects[0].nestedArray.length + objects[1].nestedArray.length);
    expect(mergedArrays.every((v) => v != null)).to.be.true;
  });

  test('immediate return for empty array', async () => {
    const testBuilder = new EchoTestBuilder();
    await openAndClose(testBuilder);
    const tmpPath = createTmpPath();
    const spaceKey = PublicKey.random();

    const testPeer = await testBuilder.createPeer({ kv: createTestLevel(tmpPath) });
    const db = await testPeer.createDatabase(spaceKey);
    const object = createExpando({ nestedArray: [] });
    db.add(object);
    await db.flush();
    await testPeer.close();

    const restartedPeer = await testBuilder.createPeer({ kv: createTestLevel(tmpPath) });
    const restartedDb = await restartedPeer.openDatabase(spaceKey, db.rootUrl!);
    const loaded: any = await restartedDb.query(Filter.ids(object.id)).first();
    expect(await loadObjectReferences([loaded], () => loaded.nestedArray)).to.deep.eq([[]]);
  });

  test('throws on timeout', async () => {
    const testBuilder = new EchoTestBuilder();
    await openAndClose(testBuilder);
    const tmpPath = createTmpPath();
    const spaceKey = PublicKey.random();

    const testPeer = await testBuilder.createPeer({ kv: createTestLevel(tmpPath) });
    const db = await testPeer.createDatabase(spaceKey);
    const object = createExpando({ nested: createExpando() });
    db.add(object);
    await db.flush();
    await testPeer.close();

    const restartedPeer = await testBuilder.createPeer({ kv: createTestLevel(tmpPath) });
    const restartedDb = await restartedPeer.openDatabase(spaceKey, db.rootUrl!);
    const loaded: any = await restartedDb.query(Filter.ids(object.id)).first();
    expect(loaded.nested?.value).to.be.undefined;
    let threw = false;
    try {
      await loadObjectReferences(loaded, (o) => o.nested, { timeout: 1 });
    } catch (e) {
      threw = true;
    }
    expect(threw).to.be.true;
  });

  test('loads as array of non-nullable items', async () => {
    class Nested extends TypedObject({ typename: 'example.com/Nested', version: '0.1.0' })({ value: Schema.Number }) {}

    class TestSchema extends TypedObject({ typename: 'example.com/Test', version: '0.1.0' })({
      nested: Schema.mutable(Schema.Array(Ref(Nested))),
    }) {}

    const testBuilder = new EchoTestBuilder();
    await openAndClose(testBuilder);
    const tmpPath = createTmpPath();
    const spaceKey = PublicKey.random();
    const testPeer = await testBuilder.createPeer({ kv: createTestLevel(tmpPath) });
    const object = live(TestSchema, { nested: [Ref.make(live(Nested, { value: 42 }))] });
    const db = await testPeer.createDatabase(spaceKey);
    db.graph.schemaRegistry.addSchema([TestSchema, Nested]);
    db.add(object);
    await db.flush();
    await testPeer.close();

    const restartedPeer = await testBuilder.createPeer({ kv: createTestLevel(tmpPath) });
    const restartedDb = await restartedPeer.openDatabase(spaceKey, db.rootUrl!);
    const loaded = (await restartedDb.query(Filter.ids(object.id)).first()) as TestSchema;
    const loadedNested = await loadObjectReferences(loaded!, (o) => o.nested.map((n) => n.target));
    const value: number = loadedNested[0].value;
    expect(value).to.eq(42);
  });
});

const createExpando = (props: any = {}): AnyLiveObject<Expando> => {
  return live(Expando, props);
};

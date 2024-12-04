//
// Copyright 2024 DXOS.org
//

import { describe, expect, test } from 'vitest';

import { Expando, ref, S, TypedObject } from '@dxos/echo-schema';
import { PublicKey } from '@dxos/keys';
import { createTestLevel } from '@dxos/kv-store/testing';
import { create } from '@dxos/live-object';
import { openAndClose } from '@dxos/test-utils';

import { type ReactiveEchoObject } from '../echo-handler';
import { EchoTestBuilder } from '../testing';
import { loadObjectReferences } from './load-object';

describe('loadObjectReferences', () => {
  test('loads a field', async () => {
    const nestedValue = 'test';
    const testBuilder = new EchoTestBuilder();
    await openAndClose(testBuilder);
    const kv = createTestLevel();
    const spaceKey = PublicKey.random();

    const testPeer = await testBuilder.createPeer(kv);
    const db = await testPeer.createDatabase(spaceKey);
    const object = createExpando({ nested: createExpando({ value: nestedValue }) });
    db.add(object);
    await db.flush();
    await testPeer.close();

    const restartedPeer = await testBuilder.createPeer(kv);
    const restartedDb = await restartedPeer.openDatabase(spaceKey, db.rootUrl!);
    const loaded: any = await restartedDb.query({ id: object.id }).first();
    expect(loaded.nested?.value).to.be.undefined;
    expect(await loadObjectReferences(loaded, (o) => o.nested?.value)).to.eq(nestedValue);
  });

  test('loads multiple fields', async () => {
    const testBuilder = new EchoTestBuilder();
    await openAndClose(testBuilder);
    const kv = createTestLevel();
    const spaceKey = PublicKey.random();

    const testPeer = await testBuilder.createPeer(kv);
    const db = await testPeer.createDatabase(spaceKey);
    const object = createExpando({ foo: createExpando({ value: 1 }), bar: createExpando({ value: 2 }) });
    db.add(object);
    await db.flush();
    await testPeer.close();

    const restartedPeer = await testBuilder.createPeer(kv);
    const restartedDb = await restartedPeer.openDatabase(spaceKey, db.rootUrl!);
    const loaded: any = await restartedDb.query({ id: object.id }).first();
    expect(loaded.nested?.value).to.be.undefined;
    const [foo, bar] = await loadObjectReferences(loaded, (o) => [o.foo, o.bar] as any[]);
    expect(foo.value + bar.value).to.eq(3);
  });

  test('loads array', async () => {
    const testBuilder = new EchoTestBuilder();
    await openAndClose(testBuilder);
    const kv = createTestLevel();
    const spaceKey = PublicKey.random();

    const testPeer = await testBuilder.createPeer(kv);
    const db = await testPeer.createDatabase(spaceKey);
    const object = createExpando({ nestedArray: [createExpando(), createExpando()] });
    db.add(object);
    await db.flush();
    await testPeer.close();

    const restartedPeer = await testBuilder.createPeer(kv);
    const restartedDb = await restartedPeer.openDatabase(spaceKey, db.rootUrl!);
    const loaded: any = await restartedDb.query({ id: object.id }).first();
    expect((loaded.nestedArray as any[]).every((v) => v == null)).to.be.true;
    const loadedArray = await loadObjectReferences(loaded, (o) => o.nestedArray as any[]);
    expect(loadedArray.every((v) => v != null)).to.be.true;
  });

  test('loads on multiple objects', async () => {
    const testBuilder = new EchoTestBuilder();
    await openAndClose(testBuilder);
    const kv = createTestLevel();
    const spaceKey = PublicKey.random();

    const testPeer = await testBuilder.createPeer(kv);
    const objects = [
      createExpando({ nestedArray: [createExpando(), createExpando()] }),
      createExpando({ nestedArray: [createExpando(), createExpando(), createExpando()] }),
    ];
    const db = await testPeer.createDatabase(spaceKey);
    objects.forEach((o) => db.add(o));
    await db.flush();
    await testPeer.close();

    const restartedPeer = await testBuilder.createPeer(kv);
    const restartedDb = await restartedPeer.openDatabase(spaceKey, db.rootUrl!);
    const loaded: any[] = await Promise.all(objects.map((o) => restartedDb.query({ id: o.id }).first()));
    const loadedArrays = await loadObjectReferences(loaded, (o) => o.nestedArray as any[]);
    const mergedArrays = loadedArrays.flatMap((v) => v);
    expect(mergedArrays.length).to.eq(objects[0].nestedArray.length + objects[1].nestedArray.length);
    expect(mergedArrays.every((v) => v != null)).to.be.true;
  });

  test('immediate return for empty array', async () => {
    const testBuilder = new EchoTestBuilder();
    await openAndClose(testBuilder);
    const kv = createTestLevel();
    const spaceKey = PublicKey.random();

    const testPeer = await testBuilder.createPeer(kv);
    const db = await testPeer.createDatabase(spaceKey);
    const object = createExpando({ nestedArray: [] });
    db.add(object);
    await db.flush();
    await testPeer.close();

    const restartedPeer = await testBuilder.createPeer(kv);
    const restartedDb = await restartedPeer.openDatabase(spaceKey, db.rootUrl!);
    const loaded: any = await restartedDb.query({ id: object.id }).first();
    expect(await loadObjectReferences([loaded], () => loaded.nestedArray)).to.deep.eq([[]]);
  });

  test('throws on timeout', async () => {
    const testBuilder = new EchoTestBuilder();
    await openAndClose(testBuilder);
    const kv = createTestLevel();
    const spaceKey = PublicKey.random();

    const testPeer = await testBuilder.createPeer(kv);
    const db = await testPeer.createDatabase(spaceKey);
    const object = createExpando({ nested: createExpando() });
    db.add(object);
    await db.flush();
    await testPeer.close();

    const restartedPeer = await testBuilder.createPeer(kv);
    const restartedDb = await restartedPeer.openDatabase(spaceKey, db.rootUrl!);
    const loaded: any = await restartedDb.query({ id: object.id }).first();
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
    class Nested extends TypedObject({ typename: 'example.com/Nested', version: '0.1.0' })({ value: S.Number }) {}

    class TestSchema extends TypedObject({ typename: 'example.com/Test', version: '0.1.0' })({
      nested: S.mutable(S.Array(ref(Nested))),
    }) {}

    const testBuilder = new EchoTestBuilder();
    await openAndClose(testBuilder);
    const kv = createTestLevel();
    const spaceKey = PublicKey.random();
    const testPeer = await testBuilder.createPeer(kv);
    const object = create(TestSchema, { nested: [create(Nested, { value: 42 })] });
    const db = await testPeer.createDatabase(spaceKey);
    db.graph.schemaRegistry.addSchema([TestSchema, Nested]);
    db.add(object);
    await db.flush();
    await testPeer.close();

    const restartedPeer = await testBuilder.createPeer(kv);
    const restartedDb = await restartedPeer.openDatabase(spaceKey, db.rootUrl!);
    const loaded = (await restartedDb.query({ id: object.id }).first()) as TestSchema;
    const loadedNested = await loadObjectReferences(loaded!, (o) => o.nested);
    const value: number = loadedNested[0].value;
    expect(value).to.eq(42);
  });
});

const createExpando = (props: any = {}): ReactiveEchoObject<Expando> => {
  return create(Expando, props);
};

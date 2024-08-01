//
// Copyright 2024 DXOS.org
//

import { expect } from 'chai';

import { create, type EchoReactiveObject, Expando, ref, S, TypedObject } from '@dxos/echo-schema';
import { PublicKey } from '@dxos/keys';
import { createTestLevel } from '@dxos/kv-store/testing';
import { describe, test, openAndClose } from '@dxos/test';

import { loadObjectReferences } from './load-object';
import { EchoTestBuilder } from '../testing';

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
    const loaded: any = await restartedDb.loadObjectById(object.id);
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
    const loaded: any = await restartedDb.loadObjectById(object.id);
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
    const loaded: any = await restartedDb.loadObjectById(object.id);
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
    const loaded: any[] = await Promise.all(objects.map((o) => restartedDb.loadObjectById(o.id)));
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
    const loaded: any = await restartedDb.loadObjectById(object.id);
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
    const loaded: any = await restartedDb.loadObjectById(object.id);
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
    class Nested extends TypedObject({ typename: 'Nested', version: '1.0.0' })({ value: S.Number }) {}

    class TestSchema extends TypedObject({ typename: 'Test', version: '1.0.0' })({
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
    const loaded = await restartedDb.loadObjectById<TestSchema>(object.id);
    const loadedNested = await loadObjectReferences(loaded!, (o) => o.nested);
    const value: number = loadedNested[0].value;
    expect(value).to.eq(42);
  });
});

const createExpando = (props: any = {}): EchoReactiveObject<Expando> => {
  return create(Expando, props);
};

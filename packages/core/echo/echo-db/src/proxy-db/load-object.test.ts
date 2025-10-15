//
// Copyright 2024 DXOS.org
//

import * as Schema from 'effect/Schema';
import { describe, expect, test } from 'vitest';

import { Obj, Ref, Type } from '@dxos/echo';
import { Filter } from '@dxos/echo';
import { PublicKey } from '@dxos/keys';
import { createTestLevel } from '@dxos/kv-store/testing';
import { openAndClose } from '@dxos/test-utils';

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
    const object = Obj.make(Type.Expando, { nested: Obj.make(Type.Expando, { value: nestedValue }) });
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
    const object = Obj.make(Type.Expando, {
      foo: Obj.make(Type.Expando, { value: 1 }),
      bar: Obj.make(Type.Expando, { value: 2 }),
    });
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
    const object = Obj.make(Type.Expando, { nestedArray: [Obj.make(Type.Expando, {}), Obj.make(Type.Expando, {})] });
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
      Obj.make(Type.Expando, { nestedArray: [Obj.make(Type.Expando, {}), Obj.make(Type.Expando, {})] }),
      Obj.make(Type.Expando, {
        nestedArray: [Obj.make(Type.Expando, {}), Obj.make(Type.Expando, {}), Obj.make(Type.Expando, {})],
      }),
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
    const object = Obj.make(Type.Expando, { nestedArray: [] });
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
    const object = Obj.make(Type.Expando, { nested: Obj.make(Type.Expando, {}) });
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
    const Nested = Schema.Struct({ value: Schema.Number }).pipe(
      Type.Obj({ typename: 'example.com/Nested', version: '0.1.0' }),
    );

    const TestSchema = Schema.Struct({
      nested: Schema.mutable(Schema.Array(Type.Ref(Nested))),
    }).pipe(Type.Obj({ typename: 'example.com/Test', version: '0.1.0' }));

    const testBuilder = new EchoTestBuilder();
    await openAndClose(testBuilder);
    const tmpPath = createTmpPath();
    const spaceKey = PublicKey.random();
    const testPeer = await testBuilder.createPeer({ kv: createTestLevel(tmpPath) });
    const object = Obj.make(TestSchema, { nested: [Ref.make(Obj.make(Nested, { value: 42 }))] });
    const db = await testPeer.createDatabase(spaceKey);
    db.graph.schemaRegistry.addSchema([TestSchema, Nested]);
    db.add(object);
    await db.flush();
    await testPeer.close();

    const restartedPeer = await testBuilder.createPeer({ kv: createTestLevel(tmpPath) });
    const restartedDb = await restartedPeer.openDatabase(spaceKey, db.rootUrl!);
    const loaded = await restartedDb.query(Filter.ids(object.id)).first();
    const loadedNested = await loadObjectReferences(loaded!, (o) => o.nested.map((n: any) => n.target));
    const value: number = loadedNested[0].value;
    expect(value).to.eq(42);
  });
});

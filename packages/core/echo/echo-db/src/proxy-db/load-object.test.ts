//
import { expect } from 'chai';

import { create, type EchoReactiveObject, Expando, ref, S, TypedObject } from '@dxos/echo-schema';
import { describe, test } from '@dxos/test';

import { loadObjectReferences } from './load-object-references';
import { TestBuilder } from '../testing';

// Copyright 2024 DXOS.org
//

describe('loadObjectReferences', () => {
  test('loads a field', async () => {
    const nestedValue = 'test';
    const testBuilder = new TestBuilder({ spaceFragmentationEnabled: true });
    const testPeer = await testBuilder.createPeer();
    const object = createExpando({ nested: createExpando({ value: nestedValue }) });
    testPeer.db.add(object);

    const restartedPeer = await testBuilder.createPeer(testPeer.spaceKey, testPeer.automergeDocId);
    const loaded: any = await restartedPeer.db.loadObjectById(object.id);
    expect(loaded.nested?.value).to.be.undefined;
    expect(await loadObjectReferences(loaded, (o) => o.nested?.value)).to.eq(nestedValue);
  });

  test('loads multiple fields', async () => {
    const testBuilder = new TestBuilder({ spaceFragmentationEnabled: true });
    const testPeer = await testBuilder.createPeer();
    const object = createExpando({ foo: createExpando({ value: 1 }), bar: createExpando({ value: 2 }) });
    testPeer.db.add(object);

    const restartedPeer = await testBuilder.createPeer(testPeer.spaceKey, testPeer.automergeDocId);
    const loaded: any = await restartedPeer.db.loadObjectById(object.id);
    expect(loaded.nested?.value).to.be.undefined;
    const [foo, bar] = await loadObjectReferences(loaded, (o) => [o.foo, o.bar] as any[]);
    expect(foo.value + bar.value).to.eq(3);
  });

  test('loads array', async () => {
    const testBuilder = new TestBuilder({ spaceFragmentationEnabled: true });
    const testPeer = await testBuilder.createPeer();
    const object = createExpando({ nestedArray: [createExpando(), createExpando()] });
    testPeer.db.add(object);

    const restartedPeer = await testBuilder.createPeer(testPeer.spaceKey, testPeer.automergeDocId);
    const loaded: any = await restartedPeer.db.loadObjectById(object.id);
    expect((loaded.nestedArray as any[]).every((v) => v == null)).to.be.true;
    const loadedArray = await loadObjectReferences(loaded, (o) => o.nestedArray as any[]);
    expect(loadedArray.every((v) => v != null)).to.be.true;
  });

  test('loads on multiple objects', async () => {
    const testBuilder = new TestBuilder({ spaceFragmentationEnabled: true });
    const testPeer = await testBuilder.createPeer();
    const objects = [
      createExpando({ nestedArray: [createExpando(), createExpando()] }),
      createExpando({ nestedArray: [createExpando(), createExpando(), createExpando()] }),
    ];
    objects.forEach((o) => testPeer.db.add(o));

    const restartedPeer = await testBuilder.createPeer(testPeer.spaceKey, testPeer.automergeDocId);
    const loaded: any[] = await Promise.all(objects.map((o) => restartedPeer.db.loadObjectById(o.id)));
    const loadedArrays = await loadObjectReferences(loaded, (o) => o.nestedArray as any[]);
    const mergedArrays = loadedArrays.flatMap((v) => v);
    expect(mergedArrays.length).to.eq(objects[0].nestedArray.length + objects[1].nestedArray.length);
    expect(mergedArrays.every((v) => v != null)).to.be.true;
  });

  test('immediate return for empty array', async () => {
    const testBuilder = new TestBuilder({ spaceFragmentationEnabled: true });
    const testPeer = await testBuilder.createPeer();
    const object = createExpando({ nestedArray: [] });
    testPeer.db.add(object);

    const restartedPeer = await testBuilder.createPeer(testPeer.spaceKey, testPeer.automergeDocId);
    const loaded: any = await restartedPeer.db.loadObjectById(object.id);
    expect(await loadObjectReferences([loaded], () => loaded.nestedArray)).to.deep.eq([[]]);
  });

  test('throws on timeout', async () => {
    const testBuilder = new TestBuilder({ spaceFragmentationEnabled: true });
    const testPeer = await testBuilder.createPeer();
    const object = createExpando({ nested: createExpando() });
    testPeer.db.add(object);
    testPeer.db.remove(object.nested);

    const restartedPeer = await testBuilder.createPeer(testPeer.spaceKey, testPeer.automergeDocId);
    const loaded: any = await restartedPeer.db.loadObjectById(object.id);
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

    const testBuilder = new TestBuilder({ spaceFragmentationEnabled: true });
    const testPeer = await testBuilder.createPeer();
    const object = create(TestSchema, { nested: [create(Nested, { value: 42 })] });
    testPeer.db.graph.schemaRegistry.addSchema([TestSchema, Nested]);
    testPeer.db.add(object);

    const restartedPeer = await testBuilder.createPeer(testPeer.spaceKey, testPeer.automergeDocId);
    const loaded = await restartedPeer.db.loadObjectById<TestSchema>(object.id);
    const loadedNested = await loadObjectReferences(loaded!, (o) => o.nested);
    const value: number = loadedNested[0].value;
    expect(value).to.eq(42);
  });
});

const createExpando = (props: any = {}): EchoReactiveObject<Expando> => {
  return create(Expando, props);
};

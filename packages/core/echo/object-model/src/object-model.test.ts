//
// Copyright 2020 DXOS.org
//

import expect from 'expect';

import { ModelFactory, TestBuilder } from '@dxos/model-factory';
import { describe, test } from '@dxos/test';

import { ObjectModel } from './object-model';
import { Reference } from './reference';
import { validateKey } from './util';
import { OrderedArray } from './yjs-container';

describe('ObjectModel', () => {
  test('checks valid keys', () => {
    const valid = ['x', 'foo', 'foo_bar', 'foo.bar', '@type', '$type', 'foo$bar'];
    for (const key of valid) {
      expect(validateKey(key)).toEqual(key);
    }

    const invalid = ['', ' ', '@', 'foo bar', '.foo', 'foo.', 'foo..bar'];
    for (const key of invalid) {
      expect(() => validateKey(key)).toThrow();
    }
  });

  test('can set a property', async () => {
    const testBuilder = new TestBuilder(new ModelFactory().registerModel(ObjectModel), ObjectModel);
    const { model } = testBuilder.createPeer();

    await model.set('foo', 'bar');
    expect(model.get('foo')).toEqual('bar');

    await model.set('baz', 2 ** 33);
    expect(model.get('baz')).toEqual(2 ** 33);
  });

  test('can set a dot property', async () => {
    const testBuilder = new TestBuilder(new ModelFactory().registerModel(ObjectModel), ObjectModel);
    const { model } = testBuilder.createPeer();

    await model.set('foo.bar', 100);
    expect(model.get('foo')).toEqual({ bar: 100 });
  });

  test('can remove a property', async () => {
    const testBuilder = new TestBuilder(new ModelFactory().registerModel(ObjectModel), ObjectModel);
    const { model } = testBuilder.createPeer();

    await model.set('foo', 'bar');
    expect(model.get('foo')).toEqual('bar');

    await model.set('foo', undefined);
    expect(model.get('foo')).toEqual(undefined);
  });

  test('can set multiple properties using the builder pattern', async () => {
    const testBuilder = new TestBuilder(new ModelFactory().registerModel(ObjectModel), ObjectModel);
    const { model } = testBuilder.createPeer();

    await model.builder().set('foo', 100).set('bar', true).commit();

    expect(model.get('foo')).toEqual(100);
    expect(model.get('bar')).toEqual(true);
  });

  test('property updates are optimistically applied', async () => {
    const testBuilder = new TestBuilder(new ModelFactory().registerModel(ObjectModel), ObjectModel);
    const { model } = testBuilder.createPeer();

    const promise = model.set('foo', 'bar');
    expect(model.get('foo')).toEqual('bar');

    await promise;
  });

  test('timeframe is updated after a mutation', async () => {
    const testBuilder = new TestBuilder(new ModelFactory().registerModel(ObjectModel), ObjectModel);
    const peer = testBuilder.createPeer();

    expect(peer.timeframe.get(peer.key)).toEqual(undefined);

    await peer.model.set('foo', 'bar');
    expect(peer.timeframe.get(peer.key)).toEqual(0);
  });

  test('two peers', async () => {
    const testBuilder = new TestBuilder(new ModelFactory().registerModel(ObjectModel), ObjectModel);
    const peer1 = testBuilder.createPeer();
    const peer2 = testBuilder.createPeer();

    await peer1.model.set('foo', 'bar');
    await testBuilder.waitForReplication();
    expect(peer2.model.get('foo')).toEqual('bar');
  });

  test('consistency', async () => {
    const testBuilder = new TestBuilder(new ModelFactory().registerModel(ObjectModel), ObjectModel);
    const peer1 = testBuilder.createPeer();
    const peer2 = testBuilder.createPeer();

    testBuilder.configureReplication(false);

    await peer1.model.set('title', 'DXOS');
    await peer2.model.set('title', 'Braneframe');

    testBuilder.configureReplication(true);
    await testBuilder.waitForReplication();

    // Peer states have converged to a single value.
    expect(peer1.model.get('title')).toEqual(peer2.model.get('title'));
  });

  test('reference', async () => {
    const testBuilder = new TestBuilder(new ModelFactory().registerModel(ObjectModel), ObjectModel);
    const peer1 = testBuilder.createPeer();
    const peer2 = testBuilder.createPeer();

    const reference = new Reference('<reference id>');
    await peer1.model.set('anotherItem', reference);
    expect(peer1.model.get('anotherItem')).toEqual(reference);

    testBuilder.configureReplication(true);
    await testBuilder.waitForReplication();

    expect(peer2.model.get('anotherItem')).toEqual(reference);
  });

  describe('ordered array', () => {
    test('assign', async () => {
      const testBuilder = new TestBuilder(new ModelFactory().registerModel(ObjectModel), ObjectModel);
      const peer1 = testBuilder.createPeer();
      const peer2 = testBuilder.createPeer();

      await peer1.model.set('array', OrderedArray.fromValues([1, 3]));
      expect(peer1.model.get('array') instanceof OrderedArray).toBeTruthy();
      expect(peer1.model.get('array').toArray()).toEqual([1, 3]);

      testBuilder.configureReplication(true);
      await testBuilder.waitForReplication();

      expect(peer2.model.get('array') instanceof OrderedArray).toBeTruthy();
      expect(peer2.model.get('array').toArray()).toEqual([1, 3]);
    });

    test('mutate', async () => {
      const testBuilder = new TestBuilder(new ModelFactory().registerModel(ObjectModel), ObjectModel);
      const peer1 = testBuilder.createPeer();
      const peer2 = testBuilder.createPeer();

      await peer1.model.set('tags', OrderedArray.fromValues(['red', 'green', 'blue']));

      testBuilder.configureReplication(true);
      await testBuilder.waitForReplication();
      expect(peer2.model.get('tags') instanceof OrderedArray).toBeTruthy();
      expect(peer2.model.get('tags').toArray()).toEqual(['red', 'green', 'blue']);

      await peer2.model.builder().arrayDelete('tags', 1).arrayInsert('tags', 0, ['green']).commit();

      await testBuilder.waitForReplication();
      expect(peer2.model.get('tags') instanceof OrderedArray).toBeTruthy();
      expect(peer2.model.get('tags').toArray()).toEqual(['green', 'red', 'blue']);
    });

    test.only('references inside arrays', async () => {
      const testBuilder = new TestBuilder(new ModelFactory().registerModel(ObjectModel), ObjectModel);
      const peer1 = testBuilder.createPeer();
      const peer2 = testBuilder.createPeer();

      const array = ['red', new Reference('123')];
      await peer1.model.set('tags', OrderedArray.fromValues(array));
      expect(peer1.model.get('tags').toArray()).toEqual(array);

      testBuilder.configureReplication(true);
      await testBuilder.waitForReplication();

      expect(peer2.model.get('tags').toArray()).toEqual(['red', new Reference('123')]);
    });

    test('arrays of objects');
  });
});

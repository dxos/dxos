//
// Copyright 2020 DXOS.org
//

import expect from 'expect';

// TODO(burdon): Rename TestRig and/or move to separate package.
import { ModelFactory, TestRig } from '@dxos/model-factory';

import { ObjectModel } from './object-model';
import { validateKey } from './util';

describe('ObjectModel', function () {
  it('checks valid keys', function () {
    const valid = ['x', 'foo', 'foo_bar', 'foo.bar'];
    for (const key of valid) {
      expect(validateKey(key)).toEqual(key);
    }

    const invalid = ['', ' ', '@', 'foo bar', '.foo', 'foo.', 'foo..bar'];
    for (const key of invalid) {
      expect(() => validateKey(key)).toThrow();
    }
  });

  it('can set a property', async function () {
    const rig = new TestRig(new ModelFactory().registerModel(ObjectModel), ObjectModel);
    const { model } = rig.createPeer();

    await model.set('foo', 'bar');
    expect(model.get('foo')).toEqual('bar');

    await model.set('baz', 2 ** 33);
    expect(model.get('baz')).toEqual(2 ** 33);
  });

  it('can set a dot property', async function () {
    const rig = new TestRig(new ModelFactory().registerModel(ObjectModel), ObjectModel);
    const { model } = rig.createPeer();

    await model.set('foo.bar', 100);
    expect(model.get('foo')).toEqual({ bar: 100 });
  });

  it('can remove a property', async function () {
    const rig = new TestRig(new ModelFactory().registerModel(ObjectModel), ObjectModel);
    const { model } = rig.createPeer();

    await model.set('foo', 'bar');
    expect(model.get('foo')).toEqual('bar');

    await model.set('foo', undefined);
    expect(model.get('foo')).toEqual(undefined);
  });

  it('can set multiple properties using the builder pattern', async function () {
    const rig = new TestRig(new ModelFactory().registerModel(ObjectModel), ObjectModel);
    const { model } = rig.createPeer();

    await model.builder().set('foo', 100).set('bar', true).commit();

    expect(model.get('foo')).toEqual(100);
    expect(model.get('bar')).toEqual(true);
  });

  it('property updates are optimistically applied', async function () {
    const rig = new TestRig(new ModelFactory().registerModel(ObjectModel), ObjectModel);
    const { model } = rig.createPeer();

    const promise = model.set('foo', 'bar');
    expect(model.get('foo')).toEqual('bar');

    await promise;
  });

  it('timeframe is updated after a mutation', async function () {
    const rig = new TestRig(new ModelFactory().registerModel(ObjectModel), ObjectModel);
    const peer = rig.createPeer();

    expect(peer.timeframe.get(peer.key)).toEqual(undefined);

    await peer.model.set('foo', 'bar');
    expect(peer.timeframe.get(peer.key)).toEqual(0);
  });

  it('two peers', async function () {
    const rig = new TestRig(new ModelFactory().registerModel(ObjectModel), ObjectModel);
    const peer1 = rig.createPeer();
    const peer2 = rig.createPeer();

    await peer1.model.set('foo', 'bar');
    await rig.waitForReplication();
    expect(peer2.model.get('foo')).toEqual('bar');
  });

  it('consistency', async function () {
    const rig = new TestRig(new ModelFactory().registerModel(ObjectModel), ObjectModel);
    const peer1 = rig.createPeer();
    const peer2 = rig.createPeer();

    rig.configureReplication(false);

    await peer1.model.set('title', 'DXOS');
    await peer2.model.set('title', 'Braneframe');

    rig.configureReplication(true);
    await rig.waitForReplication();

    // Peer states have converged to a single value.
    expect(peer1.model.get('title')).toEqual(peer2.model.get('title'));
  });
});

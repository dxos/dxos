//
// Copyright 2020 DXOS.org
//

import expect from 'expect';

import { ModelFactory, TestRig } from '@dxos/model-factory';

import { ObjectModel } from './object-model';

describe('ObjectModel', () => {
  it('can set a property', async () => {
    const rig = new TestRig(new ModelFactory().registerModel(ObjectModel), ObjectModel);
    const { model } = rig.createPeer();

    await model.set('foo', 'bar');
    expect(model.get('foo')).toEqual('bar');
  });

  // TODO(burdon): Test setting undefined removes property.

  it('can set multiple properties using the builder pattern', async () => {
    const rig = new TestRig(new ModelFactory().registerModel(ObjectModel), ObjectModel);
    const { model } = rig.createPeer();

    await model
      .builder()
      .set('foo', 100)
      .set('bar', true)
      .commit();

    expect(model.get('foo')).toEqual(100);
    expect(model.get('bar')).toEqual(true);
  })

  it('property updates are optimistically applied', async () => {
    const rig = new TestRig(new ModelFactory().registerModel(ObjectModel), ObjectModel);
    const { model } = rig.createPeer();

    const promise = model.set('foo', 'bar');
    expect(model.get('foo')).toEqual('bar');

    await promise;
  });

  it('timeframe is updated after a mutation', async () => {
    const rig = new TestRig(new ModelFactory().registerModel(ObjectModel), ObjectModel);
    const peer = rig.createPeer();

    expect(peer.timeframe.get(peer.key)).toEqual(undefined);

    await peer.model.set('foo', 'bar');
    expect(peer.timeframe.get(peer.key)).toEqual(0);
  });

  it('two peers', async () => {
    const rig = new TestRig(new ModelFactory().registerModel(ObjectModel), ObjectModel);
    const peer1 = rig.createPeer();
    const peer2 = rig.createPeer();

    await peer1.model.set('foo', 'bar');
    await rig.waitForReplication();
    expect(peer2.model.get('foo')).toEqual('bar');
  });

  it('consistency', async () => {
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

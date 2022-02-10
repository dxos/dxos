//
// Copyright 2020 DXOS.org
//

// This file is not compiled or run because it introduces a circular dependency on echo-db.

import expect from 'expect';

import { ModelFactory, TestRig } from '@dxos/model-factory';

import { ObjectModel } from './object-model';

describe('ObjectModel', () => {
  it('can set a property', async () => {
    const rig = new TestRig(new ModelFactory().registerModel(ObjectModel), ObjectModel);
    const { model } = rig.createPeer();

    await model.setProperty('foo', 'bar');

    expect(model.getProperty('foo')).toEqual('bar');
  });

  it.skip('property updates are optimistically applied', async () => {
    const rig = new TestRig(new ModelFactory().registerModel(ObjectModel), ObjectModel);
    const { model } = rig.createPeer();

    const promise = model.setProperty('foo', 'bar');

    expect(model.getProperty('foo')).toEqual('bar');

    await promise;
  });

  it('timeframe is updated after a mutation', async () => {
    const rig = new TestRig(new ModelFactory().registerModel(ObjectModel), ObjectModel);
    const peer = rig.createPeer();

    expect(peer.timeframe.get(peer.key)).toEqual(undefined);

    await peer.model.setProperty('foo', 'bar');

    expect(peer.timeframe.get(peer.key)).toEqual(0);
  });

  it('two peers', async () => {
    const rig = new TestRig(new ModelFactory().registerModel(ObjectModel), ObjectModel);
    const a = rig.createPeer();
    const b = rig.createPeer();

    await a.model.setProperty('foo', 'bar');

    expect(b.model.getProperty('foo')).toEqual('bar');
  });

  it.skip('consistency', async () => {
    const rig = new TestRig(new ModelFactory().registerModel(ObjectModel), ObjectModel);
    const peer1 = rig.createPeer();
    const peer2 = rig.createPeer();

    rig.configureReplication(false);
    await peer1.model.setProperty('title', 'DXOS');
    await peer2.model.setProperty('title', 'Braneframe');
    rig.configureReplication(true);
    await rig.waitForReplication();

    // Peer states have converged to a single value.
    expect(peer1.model.getProperty('title')).toEqual(peer2.model.getProperty('title'));
  });
});

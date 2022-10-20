//
// Copyright 2020 DXOS.org
//

import expect from 'expect';

import { ModelFactory } from '../model-factory';
import { TestModel } from './test-model';
import { TestRig } from './test-rig';

describe('test model', function () {
  it('basic mutations', async function () {
    const rig = new TestRig(new ModelFactory().registerModel(TestModel), TestModel);
    const peer = rig.createPeer();

    await peer.model.set('title', 'DXOS');
    expect(peer.model.get('title')).toBe('DXOS');
    expect(peer.model.keys).toHaveLength(1);
  });

  it('multiple peers', async function () {
    const rig = new TestRig(new ModelFactory().registerModel(TestModel), TestModel);
    const peer1 = rig.createPeer();
    const peer2 = rig.createPeer();

    await peer1.model.set('title', 'DXOS');
    await peer2.model.set('title', 'Braneframe');
    await rig.waitForReplication();

    expect(peer1.model.get('title')).toBe('Braneframe');
    expect(peer2.model.get('title')).toBe('Braneframe');
  });

  it('concurrency - states converge', async function () {
    const rig = new TestRig(new ModelFactory().registerModel(TestModel), TestModel);
    const peer1 = rig.createPeer();
    const peer2 = rig.createPeer();

    rig.configureReplication(false);
    await peer1.model.set('title', 'DXOS');
    await peer2.model.set('title', 'Braneframe');
    expect(peer1.model.get('title')).toBe('DXOS');
    expect(peer2.model.get('title')).toBe('Braneframe');

    rig.configureReplication(true);
    await rig.waitForReplication();

    // Peer states have converged.
    expect(peer1.model.get('title')).toEqual(peer2.model.get('title'));

    // Peer with lower feed key wins (mutation goes first).
    const expectedTitle = peer1.key.toHex() > peer2.key.toHex() ? 'DXOS' : 'Braneframe';
    expect(peer1.model.get('title')).toBe(expectedTitle);
    expect(peer2.model.get('title')).toBe(expectedTitle);
  });
});

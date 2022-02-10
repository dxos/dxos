//
// Copyright 2020 DXOS.org
//

import expect from 'expect';
import { it as test } from 'mocha';

import { ModelFactory } from '../model-factory';
import { TestModel } from './test-model';
import { TestRig } from './test-rig';

describe('test model', () => {
  test('basic mutations', async () => {
    const rig = new TestRig(new ModelFactory().registerModel(TestModel), TestModel);
    const peer = rig.createPeer();

    await peer.model.setProperty('title', 'DXOS');
    expect(peer.model.getProperty('title')).toBe('DXOS');
    expect(peer.model.keys).toHaveLength(1);
  });

  test('multiple peers', async () => {
    const rig = new TestRig(new ModelFactory().registerModel(TestModel), TestModel);
    const peer1 = rig.createPeer();
    const peer2 = rig.createPeer();

    await peer1.model.setProperty('title', 'DXOS');
    await peer2.model.setProperty('title', 'Braneframe');
    await rig.waitForReplication();

    expect(peer1.model.getProperty('title')).toBe('Braneframe');
    expect(peer2.model.getProperty('title')).toBe('Braneframe');
  });

  test('concurrency - states converge', async () => {
    const rig = new TestRig(new ModelFactory().registerModel(TestModel), TestModel);
    const peer1 = rig.createPeer();
    const peer2 = rig.createPeer();

    rig.configureReplication(false);
    await peer1.model.setProperty('title', 'DXOS');
    await peer2.model.setProperty('title', 'Braneframe');
    expect(peer1.model.getProperty('title')).toBe('DXOS');
    expect(peer2.model.getProperty('title')).toBe('Braneframe');

    rig.configureReplication(true);
    await rig.waitForReplication();

    // Peer states have converged.
    expect(peer1.model.getProperty('title')).toEqual(peer2.model.getProperty('title'));
  });
});

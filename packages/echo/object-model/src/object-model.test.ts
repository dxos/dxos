//
// Copyright 2020 DXOS.org
//

// This file is not compiled or run because it introduces a circular dependency on echo-db

import expect from 'expect';

import { Timeframe } from '@dxos/echo-protocol';

import { ObjectModel } from './object-model';
import { TestRig } from './test-rig';

it('can set a property', async () => {
  const rig = new TestRig(ObjectModel);
  const { model } = rig.createPeer();

  await model.setProperty('foo', 'bar');

  expect(model.getProperty('foo')).toEqual('bar');
});

it('property updates are optimistically applied', async () => {
  const rig = new TestRig(ObjectModel);
  const { model } = rig.createPeer();

  const promise = model.setProperty('foo', 'bar');

  expect(model.getProperty('foo')).toEqual('bar');

  await promise;
});

it('timeframe is updated after a mutation', async () => {
  const rig = new TestRig(ObjectModel);
  const peer = rig.createPeer();

  expect(peer.timeframe.get(peer.key)).toEqual(undefined);

  await peer.model.setProperty('foo', 'bar');

  expect(peer.timeframe.get(peer.key)).toEqual(0);
});

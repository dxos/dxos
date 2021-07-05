//
// Copyright 2020 DXOS.org
//

// This file is not compiled or run because it introduces a circular dependency on echo-db

import { ObjectModel } from './object-model';
import { TestRig } from './test-rig';
import expect from 'expect';
import { it as test } from 'mocha'

it('can set a property', async () => {
  const rig = new TestRig(ObjectModel);
  const {model} = rig.createPeer()

  await model.setProperty('foo', 'bar');

  expect(model.getProperty('foo')).toEqual('bar');
});

it('property updates are optimistically applied', async () => {
  const rig = new TestRig(ObjectModel);
  const {model} = rig.createPeer()

  const promise = model.setProperty('foo', 'bar');

  expect(model.getProperty('foo')).toEqual('bar');

  await promise;
});

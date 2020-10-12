//
// Copyright 2020 DXOS.org
//

import { ObjectModel } from '@dxos/object-model';

import { createModelTestBench } from './testing';

test('create empty item', async () => {
  const [peer1, peer2] = await createModelTestBench({ model: ObjectModel });
  expect(peer1.id).toEqual(peer2.id);

  expect(peer1.model.toObject()).toEqual({});
  expect(peer2.model.toObject()).toEqual({});
});

test('create item with props', async () => {
  const [peer1, peer2] = await createModelTestBench({ model: ObjectModel, props: { foo: 'foo' } });
  expect(peer1.id).toEqual(peer2.id);

  expect(peer1.model.toObject()).toEqual({ foo: 'foo' });
  expect(peer2.model.toObject()).toEqual({ foo: 'foo' });
});

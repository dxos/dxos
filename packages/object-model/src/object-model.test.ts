//
// Copyright 2020 DXOS.org
//

import { createModelTestBench } from '@dxos/echo-db';

import { ObjectModel } from './object-model';

test('create empty item', async () => {
  const [peer1, peer2] = await createModelTestBench({ model: ObjectModel });
  expect(peer1.id).toEqual(peer2.id);

  expect(peer1.model.toObject()).toEqual({});
  expect(peer2.model.toObject()).toEqual({});
});

test('create item with props', async () => {
  const [peer1, peer2] = await createModelTestBench({ model: ObjectModel, props: { x: 100 } });
  expect(peer1.id).toEqual(peer2.id);

  expect(peer1.model.toObject()).toEqual({ x: 100 });
  expect(peer2.model.toObject()).toEqual({ x: 100 });
});

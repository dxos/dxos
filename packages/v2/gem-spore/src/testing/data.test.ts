//
// Copyright 2020 DXOS.org
//

import { convertTreeToGraph, createTree } from './data';

test('createTree', () => {
  const data = convertTreeToGraph(createTree());
  expect(data).toBeTruthy(); // TODO(burdon): Test lengths.
});

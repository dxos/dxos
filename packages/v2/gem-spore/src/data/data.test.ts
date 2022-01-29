//
// Copyright 2020 DXOS.org
//

import { convertTreeToGraph, createTree } from './data';

test('Create data', () => {
  const data = convertTreeToGraph(createTree());
  expect(data).toBeTruthy();
});

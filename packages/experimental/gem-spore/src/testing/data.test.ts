//
// Copyright 2020 DXOS.org
//

import { expect, test } from 'vitest';

import { convertTreeToGraph, createTree } from './data';

test('createTree', () => {
  const data = convertTreeToGraph(createTree());
  expect(data).to.exist; // TODO(burdon): Test lengths.
});

//
// Copyright 2020 DXOS.org
//

import { expect } from 'chai';

import { convertTreeToGraph, createTree } from './data';

it('createTree', function () {
  const data = convertTreeToGraph(createTree());
  expect(data).to.exist; // TODO(burdon): Test lengths.
});

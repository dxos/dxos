//
// Copyright 2022 DXOS.org
//

import expect from 'expect';
import { it as test } from 'mocha';
import { u } from 'unist-builder';
import { visit } from 'unist-util-visit';

test('visit', () => {
  const tree = u('tree', [
    u('text', { value: 'hello' })
  ]);

  let nodes = 0;
  visit(tree, (node, i, parent) => {
    nodes++;
  });

  expect(nodes).toBe(2);
});

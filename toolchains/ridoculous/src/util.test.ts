//
// Copyright 2022 DXOS.org
//

import expect from 'expect';
import { it as test } from 'mocha';
import { u } from 'unist-builder';
import { visit } from 'unist-util-visit';

import { visitDirectives } from './util.js';

// TODO(burdon): Test remark plugins.

test('visit', () => {
  const tree = u('tree', [
    u('text', { value: 'hello' }),
    u('html', { value: '<!-- @test -->' }),
    u('text', { value: 'world' })
  ]);

  let nodes = 0;
  visit(tree, () => {
    nodes++;
  });

  expect(nodes).toBe(4);

  let directives = 0;
  visitDirectives(tree, (directive) => {
    expect(directive).toBe('test');
    directives++;
  });

  expect(directives).toBe(1);
});

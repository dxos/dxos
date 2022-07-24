//
// Copyright 2022 DXOS.org
//

import expect from 'expect';
import { it as test } from 'mocha';
import { u } from 'unist-builder';
import { visit } from 'unist-util-visit';

import { isDirective, visitAndReplace, visitDirectives } from './util.js';

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
});

test('visitDirectives', () => {
  const tree = u('tree', [
    u('text', { value: 'hello' }),
    u('html', { value: '<!-- @test -->' }),
    u('text', { value: 'world' })
  ]);

  let directives = 0;
  visitDirectives(tree, (directive) => {
    expect(directive).toBe('test');
    directives++;
  });

  expect(directives).toBe(1);
});

test('visitAndReplace', () => {
  const tree = u('tree', [
    u('text', { value: '1' }),
    u('html', { value: '<!-- @replace(2) -->' }),
    u('text', { value: '3' }),
    u('text', { value: '4' }),
    u('html', { value: '<!-- @replace -->' })
  ]);

  // TODO(burdon): Pass in optional test method.
  visitAndReplace(tree, (node) => {
    const [directive, args] = isDirective(node) ?? [];
    if (directive === 'replace') {
      const skip = args[0] ? parseInt(args[0]) : 1;
      const nodes = [
        u('text', { value: `replace ${skip} items` })
      ];

      return [nodes, skip];
    }
  });

  expect(tree.children).toHaveLength(4);
});

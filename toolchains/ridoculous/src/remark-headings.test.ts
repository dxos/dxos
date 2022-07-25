//
// Copyright 2022 DXOS.org
//

import expect from 'expect';
import { it as test } from 'mocha';
import { u } from 'unist-builder';
import { visit } from 'unist-util-visit';

import { remarkHeadings } from './remark-headings.js';

test('visit', async () => {
  const tree = u('root', [
    u('heading', [
      u('text', { value: 'TOC' }),
      u('html', { value: '<!-- @ignore -->' })
    ]),
    u('html', { value: '<!-- @toc -->' }),
    u('heading', { depth: 2 }, [
      u('text', { value: 'HALO' })
    ]),
    u('heading', { depth: 2 }, [
      u('text', { value: 'ECHO' })
    ]),
    u('heading', { depth: 2 }, [
      u('text', { value: 'MESH' })
    ])
  ]);

  remarkHeadings({ autoNumber: true })(tree);

  // Check numbered.
  let count = 0;
  visit(tree, 'heading', (node: any) => {
    const heading = node.children[0].value;
    if (heading !== 'TOC') {
      const [, number, title] = heading.match(/^([\d.]+) (.+)$/);
      expect(number).toBeDefined();
      expect(title).toBeDefined();
      count++;
    }
  });

  // Check TOC.
  visit(tree, 'list', (node: any) => {
    expect(node.children).toHaveLength(count);
  });
});

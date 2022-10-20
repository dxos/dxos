//
// Copyright 2022 DXOS.org
//

import { diffWords } from 'diff';
import expect from 'expect';
import { toMarkdown } from 'mdast-util-to-markdown';
import { it as test } from 'mocha';
import { remark } from 'remark';
import { u } from 'unist-builder';
import { visit } from 'unist-util-visit';

import { remarkHeadings } from './remark-headings.js';

test('remarkHeadings', () => {
  const tree = u('root', [
    u('heading', { depth: 1 }, [
      u('text', { value: 'Test' })
    ]),
    u('heading', { depth: 2 }, [
      u('text', { value: 'TOC' }),
      u('html', { value: '<!-- @toc-ignore -->' })
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

  // Process content.
  remarkHeadings({ autoNumber: true })(tree);

  // Check numbered.
  let count = 0;
  visit(tree, 'heading', (node: any) => {
    const heading = node.children[0].value;
    if (heading !== 'TOC' && heading !== 'Test') {
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

test('remarkHeadings with remark', () => {
  const tree = u('root', [
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

  // Process content.
  const original = toMarkdown(tree as any);
  const { value } = remark()
    .use(remarkHeadings, { autoNumber: true })
    .processSync(original);

  // Test markdown.
  const processed = String(value);
  const match = processed.match(/^##(.+)$/gm);
  expect(match).toHaveLength(3);

  // Test numbers added.
  const added = diffWords(original, processed)
    .filter(({ added }) => added)
    .map(({ value }) => parseInt(value));
  expect(added).toEqual([1, 2, 3]);
});

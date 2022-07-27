//
// Copyright 2022 DXOS.org
//

import expect from 'expect';
import * as fs from 'fs';
import { toMarkdown } from 'mdast-util-to-markdown';
import { it as test } from 'mocha';
import { remark } from 'remark';
import { u } from 'unist-builder';

import { remarkSnippets } from './remark-snippets.js';
import { removeTrailing } from './util.js';

const tree = u('root', [
  u('html', { value: '<!-- @code(./src/test.proto) -->' })
]);

test('remarkSnippets', () => {
  // Process content.
  remarkSnippets()(tree, { baseDir: './testing' });

  const { type, lang } = tree.children[1] as any;
  expect(type).toBe('code');
  expect(lang).toBe('protobuf');
});

test('remarkSnippets with remark', () => {
  // Process content.
  const original = toMarkdown(tree as any);
  const { value } = remark()
    .use(remarkSnippets)
    .processSync(original);

  // Test markdown.
  const processed = String(value);
  const [snippet] = processed.match(/```([\s\S]*?)```/gm);

  // Test inserted file.
  const text = removeTrailing(fs.readFileSync('./testing/src/test.proto').toString());
  const test = `\`\`\`protobuf\n${text}\n\`\`\``;
  expect(snippet).toBe(test);
});

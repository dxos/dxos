//
// Copyright 2022 DXOS.org
//

import expect from 'expect';
import * as fs from 'fs';
import { toMarkdown } from 'mdast-util-to-markdown';
import { it as test } from 'mocha';
import * as path from 'path';
import { remark } from 'remark';
import { u } from 'unist-builder';

import { remarkSnippets } from './remark-snippets.js';
import { removeTrailing } from './util.js';

test('remarkSnippets with remark', async () => {
  const tree = u('root', [u('html', { value: '<!-- @code(../src/test.proto) -->' })]);

  // Process content.
  const original = toMarkdown(tree as any);
  const processor = remark().use(remarkSnippets);

  processor.data({
    config: { baseDir: path.join(process.cwd(), './testing/docs') }
  });

  const { value } = await processor.process(original);

  // Test markdown.
  const processed = String(value);
  const [snippet] = processed.match(/```([\s\S]*?)```/gm) ?? [];

  // Test inserted file.
  const text = removeTrailing(fs.readFileSync('./testing/src/test.proto').toString());
  const test = `\`\`\`protobuf\n${text}\n\`\`\``;
  expect(snippet).toBe(test);
});

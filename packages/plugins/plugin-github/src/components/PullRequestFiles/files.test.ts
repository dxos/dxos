//
// Copyright 2026 DXOS.org
//

import { describe, test } from 'vitest';

import { parsePatch } from '../../walkthrough/patch.ts';
import { buildFileTree, diffFence, fileSignature, flattenFiles } from './files.ts';

const patch = (path: string, line: string) =>
  [`diff --git a/${path} b/${path}`, `--- a/${path}`, `+++ b/${path}`, '@@ -1,1 +1,1 @@', '-old', `+${line}`].join(
    '\n',
  );

describe('buildFileTree', () => {
  test('folds single-child directories and lists directories before files', ({ expect }) => {
    const files = parsePatch(
      [
        patch('packages/core/echo/src/Filter.ts', 'a'),
        patch('packages/core/echo/src/Query.ts', 'b'),
        patch('packages/core/echo/package.json', 'c'),
        patch('README.md', 'd'),
      ].join('\n'),
    );
    const tree = buildFileTree(files);
    expect(tree.children.map((node) => node.name)).toEqual(['packages/core/echo', 'README.md']);
    expect(tree.children[0].children.map((node) => node.name)).toEqual(['src', 'package.json']);
    expect(tree.children[0].added).toBe(3);
    expect(flattenFiles(tree).map((file) => file.path)).toEqual([
      'packages/core/echo/src/Filter.ts',
      'packages/core/echo/src/Query.ts',
      'packages/core/echo/package.json',
      'README.md',
    ]);
  });
});

describe('buildFileTree, replaced paths', () => {
  test('keeps a directory that replaced a file of the same name', ({ expect }) => {
    const files = parsePatch([patch('docs/a', 'x'), patch('docs/a/b.md', 'y')].join('\n'));
    expect(flattenFiles(buildFileTree(files)).map((file) => file.path)).toEqual(['docs/a/b.md', 'docs/a']);
  });
});

describe('diffFence', () => {
  test('outgrows any backtick run in the body', ({ expect }) => {
    const [file] = parsePatch(patch('docs/README.md', '````ts'));
    expect(diffFence(file).startsWith('`````diff file=docs/README.md\n@@ -1,1 +1,1 @@')).toBe(true);
  });
});

describe('fileSignature', () => {
  test('moves when the change does', ({ expect }) => {
    const [first] = parsePatch(patch('a.ts', 'one'));
    const [second] = parsePatch(patch('a.ts', 'two'));
    expect(fileSignature(first)).toBe(fileSignature(parsePatch(patch('a.ts', 'one'))[0]));
    expect(fileSignature(first)).not.toBe(fileSignature(second));
  });
});

//
// Copyright 2026 DXOS.org
//

import { describe, test } from 'vitest';
import * as Yaml from 'yaml';

import { editFrontmatter, frontmatter, frontmatterData } from './parse.ts';

describe('frontmatter', () => {
  test('a `#` starts a comment only after whitespace, and a key with no value is absent', ({ expect }) => {
    expect(frontmatter('---\nname: C# guide\nid: org.example # the id\nversion:\nstatus: # todo\n---\n')).toEqual({
      name: 'C# guide',
      id: 'org.example',
    });
    expect(frontmatter('---\nname: "Launch: v2 # final"\nversion: 1.0\n---\n')).toEqual({
      name: 'Launch: v2 # final',
      version: '1.0',
    });
  });

  test('a block that is not a readable YAML map reads as unreadable, apart from a text with none', ({ expect }) => {
    expect(frontmatterData('# Title\n')).toEqual({});
    expect(frontmatterData('---\n---\n')).toEqual({});
    for (const block of [
      'id: x\nname: Launch: v2',
      'name: *Draft* plan',
      'name: !important thing',
      'extends: [a]\nextends: [b]',
      '# Launch\n\nSome prose',
      '- a\n- b',
    ]) {
      expect(frontmatterData(`---\n${block}\n---\nBody\n`), block).toBeUndefined();
      expect(frontmatter(`---\n${block}\n---\nBody\n`), block).toEqual({});
    }
  });
});

describe('editFrontmatter', () => {
  const read = (block: string) => frontmatterData(`---\n${block}\n---\n`);

  test('every edit reads back as the values it sets, with every other key as it was', ({ expect }) => {
    for (const [block, edits, expected] of [
      ['id:   org.x    # the id\nname: Old', { name: 'New' }, { id: 'org.x', name: 'New' }],
      ['name: >\n  Long\n  name\nid: x', { name: 'New' }, { name: 'New', id: 'x' }],
      ['name:\n  a: b\nid: x', { name: 'New' }, { name: 'New', id: 'x' }],
      ['{id: x, name: Old}', { version: '1' }, { id: 'x', name: 'Old', version: '1' }],
      ['name: Old\nid: x', { name: 'a\nb' }, { name: 'a\nb', id: 'x' }],
      ['name: Old', { name: 'Sprint #3: plan' }, { name: 'Sprint #3: plan' }],
      ['name: Old', { version: '1.0' }, { name: 'Old', version: '1.0' }],
      ['id: x', { extends: ['a', 'b'] }, { id: 'x', extends: ['a', 'b'] }],
    ] as const) {
      expect(read(editFrontmatter(block, edits)), block).toEqual(expected);
    }
  });

  test('a value set reads back as its string under YAML 1.2 and 1.1 readers, and every other line is unchanged', ({
    expect,
  }) => {
    const rest = 'version: 0.1\ndraft: true\nempty:\ndate: 2026-01-01 # day';
    for (const value of [
      '1.0',
      '0.10',
      'true',
      'null',
      '~',
      'yes',
      '0x1F',
      '1e3',
      '0o17',
      '*Draft* spec',
      '&a b',
      '!x',
      'plain',
      '',
    ]) {
      const block = editFrontmatter(`name: Old\n${rest}`, { name: value });
      expect(block.split('\n').slice(1).join('\n'), value).toBe(rest);
      const name = block.split('\n')[0];
      expect([Yaml.parse(name).name, Yaml.parse(name, { version: '1.1' }).name], value).toEqual([value, value]);
    }
  });

  test('keeps the comments in the block', ({ expect }) => {
    expect(editFrontmatter('name: Old # shown\nid: x # the id', { name: 'New' })).toBe(
      'name: New # shown\nid: x # the id',
    );
    expect(editFrontmatter('extends: [a, b] # dialects', { extends: ['a', 'c'] })).toBe('extends: [a, c] # dialects');
    expect(editFrontmatter('extends: a # dialects', { extends: ['a', 'c'] })).toBe('extends: [a, c] # dialects');
  });

  test('a list keeps its style and the items that stay, with an item pinned to a version matching its id', ({
    expect,
  }) => {
    expect(editFrontmatter('extends:\n  - v@1.0\n  - b', { extends: ['v', 'c'] })).toBe('extends:\n  - v@1.0\n  - c');
    expect(editFrontmatter('extends: [v@1.0, b]', { extends: ['v', 'c'] })).toBe('extends: [v@1.0, c]');
    expect(editFrontmatter('extends:\n  - o@1.2 # pinned\n  - v', { extends: ['o@1.2', 'v', 'c'] })).toBe(
      'extends:\n  - o@1.2 # pinned\n  - v\n  - c',
    );
  });

  test('returns a block that is not a readable YAML map as it is', ({ expect }) => {
    for (const block of ['just text', '- a\n- b', 'name: Launch: v2', 'name: *star']) {
      expect(editFrontmatter(block, { extends: ['a'], name: 'x' }), block).toBe(block);
    }
  });
});

//
// Copyright 2026 DXOS.org
//

import { describe, test } from 'vitest';

import { diffDefinitionGraphs } from './spec-diff.ts';
import { buildDefinitionGraph } from './spec-model.ts';

/** One `mdl` fence per block, as specs write them. */
const spec = (...blocks: string[]): string => blocks.map((block) => `\`\`\`mdl\n${block}\n\`\`\``).join('\n\n');

const BASE = spec(
  'type Note\n  fields:\n    title: string',
  'type Tag\n  fields:\n    name: string',
  'op tag: Tags a note.\n  input: { note: Note, tag: Tag }\n  note: A Note names its Tag.',
);

const CURRENT = spec(
  'type Note\n  fields:\n    title: string\n    body: string',
  'op tag: Tags a note.\n  input: { note: Note, folder: Folder }\n  note: A Note names its Folder.',
  'type Folder\n  fields:\n    name: string',
);

const diffOf = (current: string, base: string) =>
  diffDefinitionGraphs(buildDefinitionGraph(current), buildDefinitionGraph(base), { current, base });

describe('definition diff', () => {
  test('marks added, changed and removed definitions, and keeps the removed ones', ({ expect }) => {
    const diff = diffOf(CURRENT, BASE);
    expect(Object.fromEntries(diff.changes)).toEqual({
      Note: 'changed',
      tag: 'changed',
      Folder: 'added',
      Tag: 'removed',
    });
    expect(diff.definitions.map(({ id }) => id)).toEqual(expect.arrayContaining(['Note', 'tag', 'Folder', 'Tag']));
  });

  test('marks arrows the change added and removed', ({ expect }) => {
    const diff = diffOf(CURRENT, BASE);
    expect(Object.fromEntries(diff.edgeChanges)).toEqual({ 'tag->Folder': 'added', 'tag->Tag': 'removed' });
    expect(diff.edges.map(({ id }) => id)).toEqual(expect.arrayContaining(['tag->Folder', 'tag->Tag', 'tag->Note']));
  });

  test('re-wrapping a block is not a change', ({ expect }) => {
    const rewrapped = BASE.replace('A Note names its Tag.', 'A Note names\n    its Tag.');
    expect(diffOf(rewrapped, BASE).changes.size).toBe(0);
  });
});

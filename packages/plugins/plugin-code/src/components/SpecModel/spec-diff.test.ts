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
  'feat F-1: Notes have tags\n  req F-1.1: A Note names its Tag.',
);

const CURRENT = spec(
  'type Note\n  fields:\n    title: string\n    body: string',
  'feat F-1: Notes have tags\n  req F-1.1: A Note names its Folder.',
  'type Folder\n  fields:\n    name: string',
);

const diffOf = (current: string, base: string) =>
  diffDefinitionGraphs(buildDefinitionGraph(current), buildDefinitionGraph(base), { current, base });

describe('definition diff', () => {
  test('marks added, changed and removed definitions, and keeps the removed ones', ({ expect }) => {
    const diff = diffOf(CURRENT, BASE);
    expect(Object.fromEntries(diff.changes)).toEqual({
      'Note': 'changed',
      'F-1': 'changed',
      'Folder': 'added',
      'Tag': 'removed',
    });
    expect(diff.definitions.map(({ id }) => id)).toEqual(expect.arrayContaining(['Note', 'F-1', 'Folder', 'Tag']));
  });

  test('marks arrows the change added and removed', ({ expect }) => {
    const diff = diffOf(CURRENT, BASE);
    expect(Object.fromEntries(diff.edgeChanges)).toEqual({ 'F-1->Folder': 'added', 'F-1->Tag': 'removed' });
    expect(diff.edges.map(({ id }) => id)).toEqual(expect.arrayContaining(['F-1->Folder', 'F-1->Tag', 'F-1->Note']));
  });

  test('re-wrapping a block is not a change', ({ expect }) => {
    const rewrapped = BASE.replace('A Note names its Tag.', 'A Note names\n    its Tag.');
    expect(diffOf(rewrapped, BASE).changes.size).toBe(0);
  });
});

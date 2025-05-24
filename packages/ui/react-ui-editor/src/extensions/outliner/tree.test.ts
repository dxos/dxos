//
// Copyright 2025 DXOS.org
//

import { EditorState } from '@codemirror/state';
import { describe, test } from 'vitest';

import { type Range, outlinerTree, treeFacet, listItemToString, type Item } from './tree';
import { str } from '../../stories';
import { createMarkdownExtensions } from '../markdown';

const doc = str(
  //
  '- [ ] 1',
  '- [ ] 2',
  '  - [ ] 2.1',
  '  - [ ] 2.2',
  '    - 2.2.1',
  '    - 2.2.2',
  '    - 2.2.3',
  '  - [ ] 2.3',
  '- [ ] 3',
);

const extensions = [createMarkdownExtensions(), outlinerTree()];

describe('tree (basic)', () => {
  test('empty', ({ expect }) => {
    const state = EditorState.create({ doc: str(''), extensions });
    const tree = state.facet(treeFacet);
    expect(tree).to.exist;
  });

  test.only('empty continuation', ({ expect }) => {
    const state = EditorState.create({ doc: str('- [ ] A', '  x'), extensions });
    const tree = state.facet(treeFacet);
    tree.traverse((item, level) => {
      console.log(listItemToString(item, level));
    });
    const item = tree.find(0);
    expect(item?.contentRange).to.include({ from: 6, to: state.doc.length });
  });
});

describe('tree (advanced)', () => {
  const state = EditorState.create({ doc, extensions });

  test('traverse', ({ expect }) => {
    const tree = state.facet(treeFacet);
    let count = 0;
    tree.traverse((item, level) => {
      console.log(listItemToString(item, level));
      count++;
    });
    expect(count).toBe(9);
  });

  test('continguous', ({ expect }) => {
    const tree = state.facet(treeFacet);
    const ranges: Range[] = [];
    tree.traverse((item) => {
      ranges.push(item.docRange);
    });

    // Check no gaps between ranges.
    expect(ranges[0].from).toBe(0);
    expect(ranges[ranges.length - 1].to).toBe(state.doc.length);
    for (let i = 0; i < ranges.length - 1; i++) {
      const current = ranges[i];
      const next = ranges[i + 1];
      expect(current.to + 1).toBe(next.from);
    }
  });

  test('find', ({ expect }) => {
    const tree = state.facet(treeFacet);
    expect(tree.find(0)).to.include({ type: 'task' });
    expect(tree.find(8)).to.include({ type: 'task' });
    expect(tree.find(8)).toBe(tree.find(10));
    expect(tree.find(70)).to.include({ type: 'bullet' });
    expect(tree.find(state.doc.length)).to.include({ type: 'task' });
  });

  test('next/previous', ({ expect }) => {
    const tree = state.facet(treeFacet);
    const items: Item[] = [];
    tree.traverse((item) => {
      items.push(item);
    });

    expect(tree.prev(items[0])).not.to.exist;
    expect(tree.next(items[items.length - 1])).not.to.exist;

    for (let i = 0; i < items.length - 1; i++) {
      const current = items[i];
      const next = items[i + 1];
      expect(tree.next(current)).toEqual(next);
      expect(tree.prev(next)).toEqual(current);
    }
  });
});

//
// Copyright 2025 DXOS.org
//

import { markdown, markdownLanguage } from '@codemirror/lang-markdown';
import { EditorState } from '@codemirror/state';
import { beforeEach, describe, test } from 'vitest';

import { type Range } from '../../types';
import { join } from '../../util';

import { type Item, listItemToString, outlinerTree, treeFacet } from './tree';

const lines = [
  '- [ ] 1',
  '- [ ] 2',
  '  - [ ] 2.1',
  '  - [ ] 2.2',
  '    - 2.2.1',
  '    - 2.2.2',
  '    - 2.2.3',
  '  - [ ] 2.3',
  '- [ ] 3',
];

const getPos = (line: number) => {
  return lines.slice(0, line).reduce((acc, line) => acc + line.length + 1, 0);
};

const extensions = [markdown({ base: markdownLanguage }), outlinerTree()];

describe('tree (boundary conditions)', () => {
  test('empty', ({ expect }) => {
    const state = EditorState.create({ doc: join(''), extensions });
    const tree = state.facet(treeFacet);
    expect(tree).to.exist;
  });

  test('content range', ({ expect }) => {
    const state = EditorState.create({ doc: '- [ ] A', extensions });
    const tree = state.facet(treeFacet);
    console.log(JSON.stringify(tree, null, 2));
    expect(tree.toJSON()).to.deep.eq({
      type: 'root',
      index: -1,
      level: -1,
      lineRange: { from: 0, to: -1 },
      contentRange: { from: 0, to: -1 },
      children: [
        {
          type: 'task',
          index: 0,
          level: 0,
          lineRange: { from: 0, to: 7 },
          contentRange: { from: 6, to: 7 },
          children: [],
        },
      ],
    });

    const item = tree.find(0);
    expect(item?.contentRange).to.include({ from: 6, to: state.doc.length });
  });

  test('empty continuation', ({ expect }) => {
    const state = EditorState.create({ doc: join('- [ ] A', '  '), extensions });
    const tree = state.facet(treeFacet);
    tree.traverse((item, level) => {
      console.log(listItemToString(item, level));
    });
  });
});

describe('tree (advanced)', () => {
  let state: EditorState;

  beforeEach(() => {
    state = EditorState.create({ doc: join(...lines), extensions });
  });

  test('traverse', ({ expect }) => {
    const tree = state.facet(treeFacet);
    let count = 0;
    tree.traverse((item, level) => {
      console.log(listItemToString(item, level));
      count++;
    });
    expect(count).to.eq(9);
  });

  test('continguous', ({ expect }) => {
    const tree = state.facet(treeFacet);
    const ranges: Range[] = [];
    tree.traverse((item) => {
      console.log(listItemToString(item));
      ranges.push(item.lineRange);
    });

    // Check no gaps between ranges.
    expect(ranges[0].from).toBe(0);
    expect(ranges[ranges.length - 1].to).toBe(state.doc.length);
    for (let i = 0; i < ranges.length - 1; i++) {
      const current = ranges[i];
      const next = ranges[i + 1];
      expect(current.to + 1).to.eq(next.from);
    }
  });

  test('find', ({ expect }) => {
    const tree = state.facet(treeFacet);
    expect(tree.find(0)).to.include({ type: 'task' });
    expect(tree.find(state.doc.length)).to.include({ type: 'task' });

    expect(tree.find(getPos(1))).to.include({ type: 'task' });
    expect(tree.find(getPos(1))).to.eq(tree.find(getPos(1) + 4));
    expect(tree.find(getPos(5))).to.include({ type: 'bullet' });
  });

  test('siblings', ({ expect }) => {
    const tree = state.facet(treeFacet);
    const items: Item[] = [];
    tree.traverse((item) => {
      items.push(item);
    });

    expect(items[0].nextSibling).toBe(items[1]);
    expect(items[1].prevSibling).toBe(items[0]);

    expect(items[1].nextSibling).toBe(items[8]);
    expect(items[8].prevSibling).toBe(items[1]);
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
      expect(tree.next(current)?.index).toEqual(next.index);
      expect(tree.prev(next)?.index).toEqual(current.index);
    }
  });

  test('lastDescendant', ({ expect }) => {
    const tree = state.facet(treeFacet);
    {
      const item = tree.find(getPos(0))!;
      expect(tree.lastDescendant(item).index).to.eq(item.index);
    }
    {
      const item = tree.find(getPos(1))!;
      const last = tree.find(getPos(7))!;
      expect(tree.lastDescendant(item).index).to.eq(last.index);
    }
    {
      const item = tree.find(getPos(3))!;
      const last = tree.find(getPos(6))!;
      expect(tree.lastDescendant(item).index).to.eq(last.index);
    }
  });
});

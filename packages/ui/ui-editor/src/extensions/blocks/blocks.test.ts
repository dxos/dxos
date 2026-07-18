//
// Copyright 2026 DXOS.org
//

import { markdown, markdownLanguage } from '@codemirror/lang-markdown';
import { EditorState, type TransactionSpec } from '@codemirror/state';
import { describe, test } from 'vitest';

import { invariant } from '@dxos/invariant';

import { findBlocks, moveBlocksSpec, replaceBlocksSpec } from './blocks';
import { blockSelectionField } from './selection';

const extensions = [markdown({ base: markdownLanguage }), blockSelectionField];
const create = (doc: string) => EditorState.create({ doc, extensions });

// The blocks selected in a state, as their source strings.
const selectedText = (state: EditorState): string[] => {
  const anchors = state.field(blockSelectionField);
  const byFrom = new Map(findBlocks(state).map((block) => [block.from, block]));
  return anchors.map((anchor) => {
    const block = byFrom.get(anchor);
    invariant(block, `no block at anchor ${anchor}`);
    return state.doc.sliceString(block.from, block.to);
  });
};

// Applies a (non-null) transaction spec and returns the resulting state.
const apply = (state: EditorState, spec: TransactionSpec | null): EditorState => {
  invariant(spec, 'expected a transaction spec');
  return state.update(spec).state;
};

// The character at the caret's left, so tests can assert the caret lands at the end of a moved block.
const charBeforeCaret = (state: EditorState) => {
  const head = state.selection.main.head;
  return state.doc.sliceString(head - 1, head);
};

describe('findBlocks', () => {
  test('splits into top-level blocks', ({ expect }) => {
    const state = create('# Heading\n\npara\n\n- a\n- b');
    const blocks = findBlocks(state);
    expect(blocks.length).to.eq(3);
    expect(state.doc.sliceString(blocks[0].from, blocks[0].to)).to.eq('# Heading');
    expect(state.doc.sliceString(blocks[1].from, blocks[1].to)).to.eq('para');
    // A list is a single block.
    expect(state.doc.sliceString(blocks[2].from, blocks[2].to)).to.eq('- a\n- b');
  });
});

describe('moveBlocksSpec', () => {
  test('moves a block before another and puts the caret at its end', ({ expect }) => {
    const state = create('A\n\nB\n\nC');
    const next = apply(state, moveBlocksSpec(state, [0], 2));
    expect(next.doc.toString()).to.eq('B\n\nA\n\nC');
    // The caret is at the end of the moved block — not the block that took its old slot.
    expect(charBeforeCaret(next)).to.eq('A');
    const moved = findBlocks(next)[1];
    expect(next.selection.main.head).to.eq(moved.to);
  });

  test('moves a block to the end', ({ expect }) => {
    const state = create('A\n\nB\n\nC');
    const next = apply(state, moveBlocksSpec(state, [0], 3));
    expect(next.doc.toString()).to.eq('B\n\nC\n\nA');
    expect(next.selection.main.head).to.eq(next.doc.length);
  });

  test('moves the last block without orphaning its separator', ({ expect }) => {
    const state = create('A\n\nB\n\nC');
    const next = apply(state, moveBlocksSpec(state, [2], 0));
    expect(next.doc.toString()).to.eq('C\n\nA\n\nB');
  });

  test('moves multiple contiguous blocks as a group', ({ expect }) => {
    const state = create('A\n\nB\n\nC\n\nD');
    const next = apply(state, moveBlocksSpec(state, [0, 1], 4));
    expect(next.doc.toString()).to.eq('C\n\nD\n\nA\n\nB');
  });

  test('moves multiple non-contiguous blocks, preserving order', ({ expect }) => {
    const state = create('A\n\nB\n\nC\n\nD');
    const next = apply(state, moveBlocksSpec(state, [0, 2], 4));
    expect(next.doc.toString()).to.eq('B\n\nD\n\nA\n\nC');
  });

  test('keeps the moved blocks selected after the drop', ({ expect }) => {
    const state = create('A\n\nB\n\nC\n\nD');
    // A single block dropped before another.
    expect(selectedText(apply(state, moveBlocksSpec(state, [1], 3)))).to.deep.eq(['B']);
    // Multiple non-contiguous blocks moved to the end stay selected, in document order.
    expect(selectedText(apply(state, moveBlocksSpec(state, [0, 2], 4)))).to.deep.eq(['A', 'C']);
  });

  test('is a no-op when dropping onto a source block', ({ expect }) => {
    const state = create('A\n\nB\n\nC');
    expect(moveBlocksSpec(state, [0], 0)).to.eq(null);
    expect(moveBlocksSpec(state, [1], 1)).to.eq(null);
  });

  test('is a no-op for empty sources', ({ expect }) => {
    const state = create('A\n\nB');
    expect(moveBlocksSpec(state, [], 1)).to.eq(null);
  });
});

describe('replaceBlocksSpec', () => {
  test('cut deletes the block and its separator', ({ expect }) => {
    const state = create('A\n\nB\n\nC');
    const next = apply(state, replaceBlocksSpec(state, [1], null));
    expect(next.doc.toString()).to.eq('A\n\nC');
  });

  test('cut removes the last block without orphaning its separator', ({ expect }) => {
    const state = create('A\n\nB\n\nC');
    const next = apply(state, replaceBlocksSpec(state, [2], null));
    expect(next.doc.toString()).to.eq('A\n\nB');
  });

  test('cut removes multiple blocks', ({ expect }) => {
    const state = create('A\n\nB\n\nC\n\nD');
    const next = apply(state, replaceBlocksSpec(state, [1, 2], null));
    expect(next.doc.toString()).to.eq('A\n\nD');
  });

  test('paste replaces the selected block with block(s)', ({ expect }) => {
    const state = create('A\n\nB\n\nC');
    const next = apply(state, replaceBlocksSpec(state, [1], 'X\n\nY'));
    expect(next.doc.toString()).to.eq('A\n\nX\n\nY\n\nC');
  });

  test('is a no-op for empty indices', ({ expect }) => {
    const state = create('A\n\nB');
    expect(replaceBlocksSpec(state, [], 'X')).to.eq(null);
  });
});

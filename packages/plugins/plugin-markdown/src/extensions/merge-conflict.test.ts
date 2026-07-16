//
// Copyright 2026 DXOS.org
//

import { EditorState } from '@codemirror/state';
import { describe, test } from 'vitest';

import { conflictResolution, findConflicts } from './merge-conflict';

const CONFLICT = ['intro', '<<<<<<< branch', 'Moo', '=======', 'Bar', '>>>>>>> current', 'outro', ''].join('\n');

describe('findConflicts', () => {
  test('locates a conflict block and its sections', ({ expect }) => {
    const state = EditorState.create({ doc: CONFLICT });
    const regions = findConflicts(state);
    expect(regions).toHaveLength(1);
    const [region] = regions;
    expect(state.sliceDoc(region.branch.from, region.branch.to)).toBe('Moo\n');
    expect(state.sliceDoc(region.current.from, region.current.to)).toBe('Bar\n');
  });

  test('finds multiple blocks and ignores plain text', ({ expect }) => {
    const doc = [CONFLICT, CONFLICT].join('\n');
    expect(findConflicts(EditorState.create({ doc }))).toHaveLength(2);
    expect(findConflicts(EditorState.create({ doc: 'no conflicts here\n' }))).toHaveLength(0);
  });

  test('ignores an unterminated block', ({ expect }) => {
    const doc = ['<<<<<<< branch', 'Moo', '=======', 'Bar', ''].join('\n');
    expect(findConflicts(EditorState.create({ doc }))).toHaveLength(0);
  });

  test('still finds a valid block after a malformed one', ({ expect }) => {
    const doc = ['<<<<<<< orphaned start marker', 'stray', '', CONFLICT].join('\n');
    const state = EditorState.create({ doc });
    const regions = findConflicts(state);
    expect(regions).toHaveLength(1);
    expect(state.sliceDoc(regions[0].branch.from, regions[0].branch.to)).toBe('Moo\n');
  });
});

describe('conflictResolution', () => {
  test.for([
    ['branch', 'intro\nMoo\noutro\n'],
    ['current', 'intro\nBar\noutro\n'],
    ['both', 'intro\nMoo\nBar\noutro\n'],
  ] as const)('accept %s', ([choice, expected], { expect }) => {
    const state = EditorState.create({ doc: CONFLICT });
    const [region] = findConflicts(state);
    const resolved = state.update({ changes: conflictResolution(state, region, choice) });
    expect(resolved.state.doc.toString()).toBe(expected);
  });
});

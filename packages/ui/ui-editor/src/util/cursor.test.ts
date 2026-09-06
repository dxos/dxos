//
// Copyright 2026 DXOS.org
//

import { EditorState } from '@codemirror/state';
import { describe, test } from 'vitest';

import { Cursor } from './cursor';

// A converter in the shape of the automerge one: opaque cursors it minted decode, anything else throws.
const converter = {
  toCursor: (position: number) => `c${position}`,
  fromCursor: (cursor: string) => {
    if (!/^c\d+$/.test(cursor)) {
      throw new RangeError('cursor format is invalid');
    }
    return Number(cursor.slice(1));
  },
};

describe('Cursor', () => {
  test('a range round-trips through the converter', ({ expect }) => {
    const state = EditorState.create({ doc: 'hello world', extensions: [Cursor.converter.of(converter)] });
    const cursor = Cursor.getCursorFromRange(state, { from: 2, to: 7 });
    expect(Cursor.getRangeFromCursor(state, cursor)).toEqual({ from: 2, to: 7 });
  });

  test('a malformed cursor decodes to undefined rather than throwing', ({ expect }) => {
    const state = EditorState.create({ doc: 'hello world', extensions: [Cursor.converter.of(converter)] });
    expect(Cursor.getRangeFromCursor(state, '12:28')).toBeUndefined();
  });
});

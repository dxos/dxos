//
// Copyright 2026 DXOS.org
//

import { EditorState } from '@codemirror/state';
import { describe, test } from 'vitest';

import { Cursor } from './cursor';

describe('Cursor', () => {
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

  test('a range round-trips through the converter', ({ expect }) => {
    const state = EditorState.create({ doc: 'hello world', extensions: [Cursor.converter.of(converter)] });
    const cursor = Cursor.getCursorFromRange(state, { from: 2, to: 7 });
    expect(Cursor.getRangeFromCursor(state, cursor)).toEqual({ from: 2, to: 7 });
  });

  test('a cursor the converter throws on decodes to undefined', ({ expect }) => {
    expect(
      Cursor.getRangeFromCursor(
        EditorState.create({ doc: 'hello world', extensions: [Cursor.converter.of(converter)] }),
        '12:28',
      ),
    ).toBeUndefined();
  });

  test('the default converter round-trips and rejects anything but canonical decimals', ({ expect }) => {
    const state = EditorState.create({ doc: 'hello world' });
    expect(Cursor.getRangeFromCursor(state, Cursor.getCursorFromRange(state, { from: 2, to: 7 }))).toEqual({
      from: 2,
      to: 7,
    });
    expect(Cursor.getRangeFromCursor(state, 'bad:cursor')).toBeUndefined();
    expect(Cursor.getRangeFromCursor(state, '2bad:7')).toBeUndefined();
    expect(Cursor.getRangeFromCursor(state, '2')).toBeUndefined();
  });
});

//
// Copyright 2024 DXOS.org
//

import { type EditorState } from '@codemirror/state';

import { type Range } from '../types/index.ts';
import { singleValueFacet } from './facet.ts';

/**
 * Determines if two ranges overlap.
 * A range is considered to overlap if there is any intersection
 * between the two ranges, inclusive of their boundaries.
 */
export const overlap = (a: Range, b: Range): boolean => a.from <= b.to && a.to >= b.from;

/**
 * Converts indexes into the text document into stable peer-independent cursors.
 *
 * See:
 *  - https://automerge.org/automerge/api-docs/js/functions/next.getCursor.html
 *  - https://github.com/yjs/yjs?tab=readme-ov-file#relative-positions
 *
 * @param {assoc} number Negative values will associate the cursor with the previous character
 *  while positive - with the next one.
 */
export interface CursorConverter {
  toCursor(position: number, assoc?: -1 | 1): string;
  fromCursor(cursor: string): number;
}

const defaultCursorConverter: CursorConverter = {
  toCursor: (position) => position.toString(),
  // Only a canonical decimal decodes; `parseInt` would read `2bad` as 2 and pass a wrong range on.
  fromCursor: (cursor) => (/^\d+$/.test(cursor) ? Number(cursor) : Number.NaN),
};

export class Cursor {
  static readonly converter = singleValueFacet(defaultCursorConverter);

  static readonly getCursorFromRange = (state: EditorState, range: Range) => {
    const cursorConverter = state.facet(Cursor.converter);
    const from = cursorConverter.toCursor(range.from);
    const to = cursorConverter.toCursor(range.to, -1);
    return [from, to].join(':');
  };

  /**
   * Decodes a `from:to` cursor pair into a range.
   *
   * Returns `undefined`, rather than throwing, for a cursor the converter rejects or that decodes to
   * anything but integer positions: anchors arrive from the database, and one malformed anchor would
   * otherwise fail the state update for every comment.
   */
  static readonly getRangeFromCursor = (state: EditorState, cursor: string): Range | undefined => {
    const cursorConverter = state.facet(Cursor.converter);

    const parts = cursor.split(':');
    try {
      const from = cursorConverter.fromCursor(parts[0]);
      const to = cursorConverter.fromCursor(parts[1]);
      return Number.isInteger(from) && Number.isInteger(to) ? { from, to } : undefined;
    } catch {
      return undefined;
    }
  };
}

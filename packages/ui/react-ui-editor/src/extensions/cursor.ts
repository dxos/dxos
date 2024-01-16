//
// Copyright 2024 DXOS.org
//

import { Facet } from '@codemirror/state';

import type { Range } from '../hooks';

/**
 * Converts indexes into the text document into stable peer-independent cursors.
 *
 * See:
 *  - https://automerge.org/automerge/api-docs/js/functions/next.getCursor.html
 *  - https://github.com/yjs/yjs?tab=readme-ov-file#relative-positions
 *
 * @param {assoc} number Negative values will associate the cursor with the previous character
 *                       while positive - with the next one.
 */
export interface CursorConverter {
  toCursor(position: number, assoc?: -1 | 1 | undefined): string;
  fromCursor(cursor: string): number;
}

const defaultCursorConverter: CursorConverter = {
  toCursor: (position) => position.toString(),
  fromCursor: (cursor) => parseInt(cursor),
};

export class Cursor {
  static readonly converter = Facet.define<CursorConverter, CursorConverter>({
    combine: (providers) => providers[0] ?? defaultCursorConverter,
  });

  static readonly getCursorFromRange = (cursorConverter: CursorConverter, range: Range) => {
    const from = cursorConverter.toCursor(range.from);
    const to = cursorConverter.toCursor(range.to, -1);
    return [from, to].join(':');
  };

  static readonly getRangeFromCursor = (cursorConverter: CursorConverter, cursor: string) => {
    const parts = cursor.split(':');
    const from = cursorConverter.fromCursor(parts[0]);
    const to = cursorConverter.fromCursor(parts[1]);
    return from !== undefined && to !== undefined ? { from, to } : undefined;
  };
}

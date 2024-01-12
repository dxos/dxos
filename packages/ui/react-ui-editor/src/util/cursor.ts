//
// Copyright 2024 DXOS.org
//

import { Facet } from '@codemirror/state';

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

const DEFAULT_CURSOR_CONVERTER: CursorConverter = {
  toCursor: (position) => position.toString(),
  fromCursor: (cursor) => parseInt(cursor),
};

export const CursorConverter = Facet.define<CursorConverter, CursorConverter>({
  combine: (providers) => providers[0] ?? DEFAULT_CURSOR_CONVERTER,
});

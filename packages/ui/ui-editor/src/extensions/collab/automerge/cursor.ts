//
// Copyright 2024 DXOS.org
//

import { fromCursor, toCursor } from '@dxos/echo-client';
import { Doc } from '@dxos/echo-doc';
import { log } from '@dxos/log';

import { type CursorConverter } from '../../../util/index.ts';

/**
 * Maps between editor offsets and stable Automerge cursors for the text the {@link Doc.Accessor}
 * points at; falls back to empty/zero positions when the document is unavailable.
 * `beforeRead` brings the document up to the editor's content, since offsets are the editor's.
 */
export const cursorConverter = (accessor: Doc.Accessor, beforeRead?: () => void): CursorConverter => ({
  toCursor: (pos, assoc) => {
    beforeRead?.();
    try {
      return toCursor(accessor, pos, assoc);
    } catch (err) {
      log.catch(err);
      return ''; // In case of invalid request (e.g., wrong document).
    }
  },

  fromCursor: (cursor) => {
    beforeRead?.();
    try {
      return fromCursor(accessor, cursor);
    } catch (err) {
      log.catch(err);
      return 0; // In case of invalid request (e.g., wrong document).
    }
  },
});

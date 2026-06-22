//
// Copyright 2024 DXOS.org
//

import { fromCursor, toCursor } from '@dxos/echo-client';
import { Doc } from '@dxos/echo-doc';
import { log } from '@dxos/log';

import { type CursorConverter } from '../../util';

/**
 * Maps between editor offsets and stable Automerge cursors for the text the {@link Doc.Accessor}
 * points at; falls back to empty/zero positions when the document is unavailable.
 */
export const cursorConverter = (accessor: Doc.Accessor): CursorConverter => ({
  toCursor: (pos, assoc) => {
    try {
      return toCursor(accessor, pos, assoc);
    } catch (err) {
      log.catch(err);
      return ''; // In case of invalid request (e.g., wrong document).
    }
  },

  fromCursor: (cursor) => {
    try {
      return fromCursor(accessor, cursor);
    } catch (err) {
      log.catch(err);
      return 0; // In case of invalid request (e.g., wrong document).
    }
  },
});

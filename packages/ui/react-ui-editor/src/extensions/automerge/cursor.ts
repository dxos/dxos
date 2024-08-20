//
// Copyright 2024 DXOS.org
//

import { log } from '@dxos/log';
import { type DocAccessor, fromCursor, toCursor } from '@dxos/react-client/echo';

import { type CursorConverter } from '../cursor';

export const cursorConverter = (accessor: DocAccessor): CursorConverter => ({
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

//
// Copyright 2024 DXOS.org
//

import get from 'lodash.get';

import { next as A } from '@dxos/automerge/automerge';
import { type DocAccessor } from '@dxos/echo-schema';
import { log } from '@dxos/log';

import { type CursorConverter } from '../cursor';

export const cursorConverter = ({ handle, path }: DocAccessor): CursorConverter => ({
  // TODO(burdon): Handle assoc to associate with a previous character.
  toCursor: (pos) => {
    const doc = handle.docSync();
    if (!doc) {
      return '';
    }

    const value = get(doc, path);
    if (typeof value === 'string' && value.length <= pos) {
      return 'end';
    }

    try {
      // NOTE: Slice is needed because getCursor mutates the array.
      return A.getCursor(doc, path.slice(), pos);
    } catch (err) {
      log.catch(err);
      return ''; // In case of invalid request (e.g., wrong document).
    }
  },

  fromCursor: (cursor) => {
    if (cursor === '') {
      return 0;
    }

    const doc = handle.docSync();
    if (!doc) {
      return 0;
    }

    if (cursor === 'end') {
      const value = get(doc, path);
      if (typeof value === 'string') {
        return value.length;
      } else {
        return 0;
      }
    }

    try {
      // NOTE: Slice is needed because getCursor mutates the array.
      return A.getCursorPosition(doc, path.slice(), cursor);
    } catch (err) {
      log.catch(err);
      return 0; // In case of invalid request (e.g., wrong document).
    }
  },
});

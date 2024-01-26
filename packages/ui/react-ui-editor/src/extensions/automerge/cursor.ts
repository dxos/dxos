//
// Copyright 2024 DXOS.org
//

import get from 'lodash.get';

import type { Prop } from '@dxos/automerge/automerge';
import { next as am } from '@dxos/automerge/automerge';

import { type IDocHandle } from './defs';
import { type CursorConverter } from '../cursor';

export const cursorConverter = (handle: IDocHandle, path: Prop[]): CursorConverter => ({
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

    // NOTE: Slice is needed because getCursor mutates the array.
    return am.getCursor(doc, path.slice(), pos);
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

    // NOTE: Slice is needed because getCursor mutates the array.
    return am.getCursorPosition(doc, path.slice(), cursor);
  },
});

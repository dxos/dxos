//
// Copyright 2024 DXOS.org
//

import * as Y from 'yjs';

import { arrayToString, stringToArray } from '@dxos/util';

import { type CursorConverter } from '../cursor';

export const cursorConverter = (text: Y.Text): CursorConverter => ({
  toCursor: (index, assoc) => {
    return arrayToString(Y.encodeRelativePosition(Y.createRelativePositionFromTypeIndex(text, index, assoc)));
  },

  fromCursor: (cursor) => {
    return (
      Y.createAbsolutePositionFromRelativePosition(Y.decodeRelativePosition(stringToArray(cursor)), text.doc!)?.index ??
      0
    );
  },
});

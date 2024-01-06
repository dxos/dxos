import * as Y from 'yjs';
import { CursorConverter } from '../../components';
import { arrayToString, stringToArray } from '@dxos/util';

export const yjsCursorConverter = (text: Y.Text): CursorConverter => ({
  toCursor: (index, assoc) => {
    return arrayToString(Y.encodeRelativePosition(Y.createRelativePositionFromTypeIndex(text, index, assoc)));
  },
  fromCursor: cursor => {
    return Y.createAbsolutePositionFromRelativePosition(
      Y.decodeRelativePosition(stringToArray(cursor)),
      text.doc!,
    )?.index ?? 0
  }
})
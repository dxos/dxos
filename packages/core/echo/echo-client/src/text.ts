//
// Copyright 2024 DXOS.org
//

import { next as A } from '@automerge/automerge';

import { type Obj } from '@dxos/echo';
import { isProxy } from '@dxos/echo/internal';
import { assertArgument, invariant } from '@dxos/invariant';
import { getDeep } from '@dxos/util';

import * as Doc from './automerge/Doc';
import { getObjectCore } from './echo-handler';

// TODO(burdon): Handle assoc to associate with a previous character.
export const toCursor = (accessor: Doc.Accessor, pos: number, assoc = 0): A.Cursor => {
  const doc = accessor.handle.doc();
  const value = getDeep(doc, accessor.path);
  if (typeof value === 'string' && value.length <= pos) {
    return 'end';
  }

  // NOTE: Slice is needed because getCursor mutates the array.
  return A.getCursor(doc, accessor.path.slice(), pos);
};

export const toCursorRange = (accessor: Doc.Accessor, start: number, end: number) => {
  return `${toCursor(accessor, start)}:${toCursor(accessor, end)}`;
};

export const fromCursor = (accessor: Doc.Accessor, cursor: A.Cursor): number => {
  if (cursor === '') {
    return 0;
  }

  const doc = accessor.handle.doc();
  if (cursor === 'end') {
    const value = getDeep(doc, accessor.path);
    if (typeof value === 'string') {
      return value.length;
    } else {
      return 0;
    }
  }

  // NOTE: Slice is needed because getCursor mutates the array.
  return A.getCursorPosition(doc, accessor.path.slice(), cursor);
};

/**
 * Return the text value between two cursor positions.
 */
export const getTextInRange = (accessor: Doc.Accessor, start: string, end: string): string | undefined => {
  const doc = accessor.handle.doc();
  const value = getDeep(doc, accessor.path);
  if (typeof value === 'string') {
    const beginIdx = fromCursor(accessor, start);
    const endIdx = fromCursor(accessor, end);
    if (beginIdx <= value.length) {
      return value.slice(beginIdx, endIdx);
    }
  }
};

/** Return the text spanned by an anchor string (`"${fromCursor}:${toCursor}"`). */
export const getTextInAnchorRange = (accessor: Doc.Accessor, anchor: string): string | undefined => {
  // Reject extra delimiters; empty tokens stay accepted as the defined ''/'end' cursor sentinels.
  const [start, end, ...rest] = anchor.split(':');
  if (start === undefined || end === undefined || rest.length > 0) {
    return undefined;
  }
  return getTextInRange(accessor, start, end);
};

export const getRangeFromCursor = (accessor: Doc.Accessor, cursor: string) => {
  const [start, end] = cursor.split(':');
  if (start === undefined || end === undefined) {
    return undefined;
  }

  return { start: fromCursor(accessor, start), end: fromCursor(accessor, end) };
};

/**
 * Helper that updates the text value at the given path. Caller must ensure the path is valid.
 * @param obj - The object to update.
 * @param path - The path to the text value to update.
 * @param newText - The new text value.
 * @returns The updated object.
 */
export const updateText = <T extends Obj.Unknown>(obj: T, path: Doc.KeyPath, newText: string): T => {
  assertArgument(isProxy(obj), 'obj');
  invariant(path === undefined || Doc.isKeyPath(path));
  const accessor = getObjectCore(obj).getDocAccessor(path);
  accessor.handle.change((doc) => {
    A.updateText(doc, accessor.path.slice(), newText);
  });
  return obj;
};

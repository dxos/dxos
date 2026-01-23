//
// Copyright 2024 DXOS.org
//

import { next as A } from '@automerge/automerge';

import { type AnyProperties } from '@dxos/echo/internal';
import { invariant } from '@dxos/invariant';
import { isLiveObject } from '@dxos/live-object';
import { get } from '@dxos/util';

import { type DocAccessor, type KeyPath, isValidKeyPath } from './core-db';
import { type AnyLiveObject, createDocAccessor } from './echo-handler';

// TODO(burdon): Handle assoc to associate with a previous character.
export const toCursor = (accessor: DocAccessor, pos: number, assoc = 0): A.Cursor => {
  const doc = accessor.handle.doc();
  if (!doc) {
    return '';
  }

  const value = get(doc, accessor.path);
  if (typeof value === 'string' && value.length <= pos) {
    return 'end';
  }

  // NOTE: Slice is needed because getCursor mutates the array.
  return A.getCursor(doc, accessor.path.slice(), pos);
};

export const toCursorRange = (accessor: DocAccessor, start: number, end: number) => {
  return `${toCursor(accessor, start)}:${toCursor(accessor, end)}`;
};

export const fromCursor = (accessor: DocAccessor, cursor: A.Cursor): number => {
  if (cursor === '') {
    return 0;
  }

  const doc = accessor.handle.doc();
  if (!doc) {
    return 0;
  }

  if (cursor === 'end') {
    const value = get(doc, accessor.path);
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
export const getTextInRange = (accessor: DocAccessor, start: string, end: string): string | undefined => {
  const doc = accessor.handle.doc();
  const value = get(doc, accessor.path);
  if (typeof value === 'string') {
    const beginIdx = fromCursor(accessor, start);
    const endIdx = fromCursor(accessor, end);
    if (beginIdx <= value.length) {
      return value.slice(beginIdx, endIdx);
    }
  }
};

export const getRangeFromCursor = (accessor: DocAccessor, cursor: string) => {
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
export const updateText = <T extends AnyProperties>(
  obj: AnyLiveObject<T>,
  path: KeyPath,
  newText: string,
): AnyLiveObject<T> => {
  invariant(isLiveObject(obj));
  invariant(path === undefined || isValidKeyPath(path));
  const accessor = createDocAccessor(obj, path);
  accessor.handle.change((doc) => {
    A.updateText(doc, accessor.path.slice(), newText);
  });
  return obj;
};

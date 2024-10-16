//
// Copyright 2024 DXOS.org
//

import get from 'lodash.get';

import { next as A } from '@dxos/automerge/automerge';

import { type DocAccessor } from './core-db';

// TODO(burdon): Handle assoc to associate with a previous character.
export const toCursor = (accessor: DocAccessor, pos: number, assoc = 0): A.Cursor => {
  const doc = accessor.handle.docSync();
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

  const doc = accessor.handle.docSync();
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
  const doc = accessor.handle.docSync();
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

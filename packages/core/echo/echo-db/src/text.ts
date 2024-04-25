//
// Copyright 2024 DXOS.org
//

import get from 'lodash.get';

import { next as A } from '@dxos/automerge/automerge';

import { type DocAccessor } from './automerge';

export const toCursor = (accessor: DocAccessor, pos: number) => {
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

export const fromCursor = (accessor: DocAccessor, cursor: string) => {
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

export const getTextInRange = (accessor: DocAccessor, start: string, end: string) => {
  const doc = accessor.handle.docSync();
  const value = get(doc, accessor.path);
  const beginIdx = fromCursor(accessor, start);
  const endIdx = fromCursor(accessor, end);
  if (typeof value === 'string') {
    return value.slice(beginIdx, endIdx);
  } else {
    return '';
  }
};

export const getRangeFromCursor = (accessor: DocAccessor, cursor: string) => {
  const [start, end] = cursor.split(':');
  if (start === undefined || end === undefined) {
    return undefined;
  }

  return { start: fromCursor(accessor, start), end: fromCursor(accessor, end) };
};

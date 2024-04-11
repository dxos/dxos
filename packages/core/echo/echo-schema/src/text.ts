//
// Copyright 2024 DXOS.org
//

import get from 'lodash.get';

import { next as A } from '@dxos/automerge/automerge';

import { type DocAccessor, createDocAccessor, type KeyPath } from './automerge';
import { type EchoReactiveObject } from './effect/reactive';

/**
 * @deprecated
 */
export const LEGACY_TEXT_TYPE = 'dxos.Text.v0';

export const toCursor = <T>({
  object,
  path,
  accessor: _accessor,
  position: pos,
}: {
  object?: EchoReactiveObject<T>;
  path?: KeyPath;
  accessor?: DocAccessor;
  position: number;
}) => {
  const accessor = _accessor ?? (object && path ? createDocAccessor(object, path) : undefined);
  const doc = accessor?.handle.docSync();
  if (!accessor || !doc) {
    return '';
  }

  const value = get(doc, accessor.path);
  if (typeof value === 'string' && value.length <= pos) {
    return 'end';
  }

  // NOTE: Slice is needed because getCursor mutates the array.
  return A.getCursor(doc, accessor.path.slice(), pos);
};

export const fromCursor = <T>({
  object,
  path,
  accessor: _accessor,
  cursor,
}: {
  object?: EchoReactiveObject<T>;
  path?: KeyPath;
  accessor?: DocAccessor;
  cursor: string;
}) => {
  if (cursor === '') {
    return 0;
  }

  const accessor = _accessor ?? (object && path ? createDocAccessor(object, path) : undefined);
  const doc = accessor?.handle.docSync();
  if (!accessor || !doc) {
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

export const getTextInRange = <T>({
  object,
  path,
  start,
  end,
}: {
  object: EchoReactiveObject<T>;
  path: KeyPath;
  start: string;
  end: string;
}) => {
  const accessor = createDocAccessor(object, path);
  const beginIdx = fromCursor({ accessor, cursor: start });
  const endIdx = fromCursor({ accessor, cursor: end });
  const doc = accessor.handle.docSync();
  const value = get(doc, accessor.path);
  if (typeof value === 'string') {
    return value.slice(beginIdx, endIdx);
  } else {
    return '';
  }
};

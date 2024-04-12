//
// Copyright 2024 DXOS.org
//

import get from 'lodash.get';

import { next as A } from '@dxos/automerge/automerge';

import { createDocAccessor } from './automerge';
import { type EchoReactiveObject } from './effect/reactive';

/**
 * @deprecated
 */
export const LEGACY_TEXT_TYPE = 'dxos.Text.v0';

// TODO(burdon): Reconcile with cursorConverter.

// TODO(wittjosiah): Path shouldn't be hardcoded.
const path = ['content'];

export const toCursor = <T>(object: EchoReactiveObject<T>, pos: number) => {
  const accessor = createDocAccessor(object, path);
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

export const fromCursor = <T>(object: EchoReactiveObject<T>, cursor: string) => {
  if (cursor === '') {
    return 0;
  }

  const accessor = createDocAccessor(object, path);
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
 * TODO(dima?): This API will change.
 */
export const getTextInRange = (
  object: EchoReactiveObject<{ content: string }> | undefined,
  begin: string,
  end: string,
) => {
  if (object == null) {
    return '';
  }
  const beginIdx = fromCursor(object, begin);
  const endIdx = fromCursor(object, end);
  return (object.content as string).slice(beginIdx, endIdx);
};

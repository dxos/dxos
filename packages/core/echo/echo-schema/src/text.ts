import get from 'lodash.get';
import { getRawDoc } from './automerge';
import { EchoReactiveObject } from './effect/reactive';
import { next as A } from '@dxos/automerge/automerge';
import { OpaqueEchoObject } from './object';

export const LEGACY_TEXT_TYPE = 'dxos.Text.v0';

/**
 * @deprecated
 */
export const getTextContent: {
  (object: EchoReactiveObject<{ content: string }> | undefined): string | undefined;
  (object: EchoReactiveObject<{ content: string }> | undefined, defaultValue: string): string;
} = (object: EchoReactiveObject<{ content: string }> | undefined, defaultValue?: string) => {
  if (!object) {
    return defaultValue;
  }

  return (object as any)?.content ?? defaultValue;
};

// TODO(burdon): Reconcile with cursorConverter.

const path = ['content'];

export const toCursor = (object: EchoReactiveObject<{ content: string }>, pos: number) => {
  const accessor = getRawDoc(object, path);
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

export const fromCursor = (object: OpaqueEchoObject, cursor: string) => {
  if (cursor === '') {
    return 0;
  }

  const accessor = getRawDoc(object, path);
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
  object: (OpaqueEchoObject & { content: string }) | undefined,
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

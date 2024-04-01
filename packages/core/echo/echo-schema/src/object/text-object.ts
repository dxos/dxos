//
// Copyright 2022 DXOS.org
//

import get from 'lodash.get';

import { next as A } from '@dxos/automerge/automerge';
import { todo } from '@dxos/debug';
import { Reference } from '@dxos/echo-db';
import { TextKind } from '@dxos/protocols/proto/dxos/echo/model/text';

import { AbstractEchoObject } from './object';
import { isAutomergeObject, type AutomergeOptions, type TypedObject } from './typed-object';
import { base, type OpaqueEchoObject } from './types';
import { AutomergeObject, getRawDoc } from '../automerge';
import { isReactiveProxy } from '../effect/proxy';
import { type EchoReactiveObject } from '../effect/reactive';

export type TextObjectOptions = AutomergeOptions;

export const LEGACY_TEXT_TYPE = 'dxos.Text.v0';

export type AutomergeTextCompat = TypedObject<{
  kind?: TextKind;
  field: string;
  content?: string;
}>;

/**
 * @deprecated
 */
// TODO(burdon): Remove TextObject and TextModel.
export class TextObject extends AbstractEchoObject<any> {
  static [Symbol.hasInstance](instance: any) {
    return !!instance?.[base] && (isActualTextObject(instance) || isAutomergeText(instance));
  }

  // TODO(mykola): Add immutable option.
  constructor(text?: string, kind = TextKind.PLAIN, field?: string, opts?: TextObjectOptions) {
    super({});

    if (opts?.automerge === false) {
      throw new Error('Legacy hypercore-based ECHO objects are not supported');
    }

    const defaultedField = field ?? 'content'; // TODO(burdon): Factor out const.
    return new AutomergeObject(
      {
        kind,
        field: defaultedField,
        [defaultedField]: text ?? '',
      },
      { type: Reference.fromLegacyTypename(LEGACY_TEXT_TYPE) },
    ) as any;
  }

  override toString() {
    return todo();
  }

  get kind(): TextKind | undefined {
    return todo();
  }

  get model(): any | undefined {
    return todo();
  }

  get doc(): any | undefined {
    return todo();
  }

  get content(): string | undefined {
    return todo();
  }

  get text(): string {
    return todo();
  }

  toJSON() {
    return todo();
  }

  protected override _afterBind() {}

  override _itemUpdate(): void {}
}

/**
 * @deprecated Use TextObject.
 */
// TODO(burdon): Remove.
export class Text extends TextObject {}

/**
 * @deprecated
 */
export const setTextContent = (object: TextObject, text: string) => {
  if (isAutomergeObject(object)) {
    (object as any).content = text;
  } else {
    // object.content?.delete(0, object.text.length);
    // object.content?.insert(0, text as any);
  }
};

/**
 * @deprecated
 */
export const getTextContent: {
  (object: TextObject | EchoReactiveObject<{ content: string }> | undefined): string | undefined;
  (object: TextObject | EchoReactiveObject<{ content: string }> | undefined, defaultValue: string): string;
} = (object: TextObject | EchoReactiveObject<{ content: string }> | undefined, defaultValue?: string) => {
  if (!object) {
    return defaultValue;
  }

  if (isAutomergeObject(object)) {
    return (object as any)?.content ?? defaultValue;
  } else if (isReactiveProxy(object)) {
    return (object as any)?.content ?? defaultValue;
  } else {
    return (object as any)?.text ?? defaultValue;
  }
};

// TODO(burdon): Reconcile with cursorConverter.

const path = ['content'];

export const toCursor = (object: TextObject, pos: number) => {
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

/**
 * @deprecated Temporary.
 */
export const isActualTextObject = (object: unknown): object is TextObject => {
  return Object.getPrototypeOf(object) === TextObject.prototype;
};

/**
 * @deprecated Temporary.
 */
export const isAutomergeText = (object: unknown | undefined | null): object is AutomergeObject => {
  return (
    !!(object as any)?.[base] &&
    Object.getPrototypeOf((object as any)[base]) === AutomergeObject.prototype &&
    !!(object as any).field &&
    typeof (object as any)?.[(object as any).field] === 'string'
  );
};

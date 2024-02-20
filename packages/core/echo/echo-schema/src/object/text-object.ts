//
// Copyright 2022 DXOS.org
//

import get from 'lodash.get';

import { next as A } from '@dxos/automerge/automerge';
import { Reference } from '@dxos/document-model';
import { log } from '@dxos/log';
import { TextKind, type TextMutation } from '@dxos/protocols/proto/dxos/echo/model/text';
import { TextModel, type Doc, type YText, type YXmlFragment } from '@dxos/text-model';

import { AbstractEchoObject } from './object';
import { isAutomergeObject, type AutomergeOptions, type TypedObject } from './typed-object';
import { base } from './types';
import { AutomergeObject, getRawDoc } from '../automerge';

export type TextObjectOptions = AutomergeOptions;

export const LEGACY_TEXT_TYPE = 'dxos.Text.v0';

export type AutomergeTextCompat = TypedObject<{
  kind?: TextKind;
  field: string;
  content?: string;
}>;

export class TextObject extends AbstractEchoObject<TextModel> {
  static [Symbol.hasInstance](instance: any) {
    return !!instance?.[base] && (isActualTextObject(instance) || isAutomergeText(instance));
  }

  // TODO(mykola): Add immutable option.
  constructor(text?: string, kind = TextKind.PLAIN, field?: string, opts?: TextObjectOptions) {
    super(TextModel);

    // Redirect to automerge by default.
    if (opts?.automerge ?? true) {
      const defaultedField = field ?? 'content';
      return new AutomergeObject(
        {
          kind,
          field: defaultedField,
          [defaultedField]: text ?? '',
        },
        { type: Reference.fromLegacyTypename(LEGACY_TEXT_TYPE) },
      ) as any;
    }

    const mutation: TextMutation = {};
    if (kind) {
      mutation.kind = kind;
    }

    if (field) {
      mutation.field = field;
    }

    if (Object.keys(mutation).length > 0) {
      this._mutate(mutation);
    }

    if (text) {
      this.model?.insert(text, 0);
    }
  }

  override toString() {
    return this.text;
  }

  get kind(): TextKind | undefined {
    return this._model?.kind;
  }

  get model(): TextModel | undefined {
    this._signal?.notifyRead();
    return this._model;
  }

  get doc(): Doc | undefined {
    this._signal?.notifyRead();
    return this._model?.doc;
  }

  get content(): YText | YXmlFragment | undefined {
    this._signal?.notifyRead();
    return this._model?.content;
  }

  get text(): string {
    this._signal?.notifyRead();
    return this._model.textContent;
  }

  toJSON() {
    const jsonRepresentation: Record<string, any> = {
      // TODO(mykola): Delete backend (for debug).
      '@backend': 'hypercore',
      '@id': this.id,
      '@model': TextModel.meta.type,
      '@type': LEGACY_TEXT_TYPE,
      kind: this.kind,
      field: this.model?.field,
    };

    for (const [key, value] of this.model?.doc.share ?? []) {
      if (!jsonRepresentation[key] && value._map.size > 0) {
        try {
          const map = this.model!.doc.getMap(key);
          jsonRepresentation[key] = map.toJSON();
        } catch {}
      }
    }

    try {
      if (this.model?.field) {
        jsonRepresentation[this.model.field] = this.text;
      }
    } catch {}

    return jsonRepresentation;
  }

  protected override _afterBind() {
    log('_afterBind', { id: this.id });
    this._model.initialize();
  }

  override _itemUpdate(): void {
    log('_itemUpdate', { id: this.id });
    super._itemUpdate();
    this._model.initialize(); // TODO(burdon): Why initialized on each update?
    this._signal?.notifyWrite();
  }
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
    object.content?.delete(0, object.text.length);
    object.content?.insert(0, text as any);
  }
};

/**
 * @deprecated
 */
export const getTextContent: {
  (object: TextObject | undefined): string | undefined;
  (object: TextObject | undefined, defaultValue: string): string;
} = (object: TextObject | undefined, defaultValue?: string) => {
  if (!object) {
    return defaultValue;
  }

  if (isAutomergeObject(object)) {
    return (object as any)?.content ?? defaultValue;
  } else {
    return object?.text ?? defaultValue;
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

export const fromCursor = (object: TextObject, cursor: string) => {
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
export const getTextInRange = (object: TextObject, begin: string, end: string) => {
  const beginIdx = fromCursor(object, begin);
  const endIdx = fromCursor(object, end);
  return (object.content as any as string).slice(beginIdx, endIdx);
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

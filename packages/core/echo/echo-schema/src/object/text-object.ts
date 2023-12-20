//
// Copyright 2022 DXOS.org
//

import { Reference } from '@dxos/document-model';
import { log } from '@dxos/log';
import { type TextKind, type TextMutation } from '@dxos/protocols/proto/dxos/echo/model/text';
import { TextModel, type YText, type YXmlFragment, type Doc } from '@dxos/text-model';

import { AbstractEchoObject } from './object';
import { type AutomergeOptions, type TypedObject, getGlobalAutomergePreference } from './typed-object';
import { AutomergeObject } from '../automerge';

export type TextObjectOptions = AutomergeOptions;

export const LEGACY_TEXT_TYPE = 'dxos.Text.v0';

export type AutomergeTextCompat = TypedObject<{
  kind?: TextKind;
  field: string;
  content?: string;
}>;

export class TextObject extends AbstractEchoObject<TextModel> {
  // TODO(mykola): Add immutable option.
  constructor(text?: string, kind?: TextKind, field?: string, opts?: TextObjectOptions) {
    super(TextModel);

    if (opts?.useAutomergeBackend ?? getGlobalAutomergePreference()) {
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
    const jsonRepresentation = {
      // TODO(mykola): Delete backend (for debug).
      '@backend': 'hypercore',
      '@id': this.id,
      '@model': TextModel.meta.type,
      '@type': LEGACY_TEXT_TYPE,
      kind: this.kind,
      field: this.model?.field,
    };
    if (this.model?.field) {
      (jsonRepresentation as any)[this.model.field] = this.text;
    }

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

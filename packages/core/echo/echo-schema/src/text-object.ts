//
// Copyright 2022 DXOS.org
//

import { TextKind, TextMutation } from '@dxos/protocols/proto/dxos/echo/model/text';
import { TextModel, type YText, type YXmlFragment, type Doc } from '@dxos/text-model';

import { EchoObject } from './object';

export class Text extends EchoObject<TextModel> {
  // TODO(burdon): Change to object.
  constructor(text?: string, kind?: TextKind, field?: string) {
    super(TextModel);

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
    return this.model?.kind;
  }

  get doc(): Doc | undefined {
    this._database?._logObjectAccess(this);
    return this._model?.doc;
  }

  get content(): YText | YXmlFragment | undefined {
    return this.model?.content;
  }

  get model(): TextModel | undefined {
    this._database?._logObjectAccess(this);
    return this._model;
  }

  /**
   * Returns the text content of the object.
   */
  get text(): string {
    this._database?._logObjectAccess(this);
    return this._model.textContent;
  }

  toJSON() {
    return {
      '@id': this.id,
      '@model': TextModel.meta.type,
      text: this.text,
    };
  }

  protected override _afterBind() {
    this._model.initialize();
  }

  override _itemUpdate(): void {
    this._model.initialize();
  }
}

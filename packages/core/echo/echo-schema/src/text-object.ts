//
// Copyright 2022 DXOS.org
//

import { TextKind, TextMutation } from '@dxos/protocols/proto/dxos/echo/model/text';
import { TextModel, type YText, type YXmlFragment, type Doc } from '@dxos/text-model';

import { EchoObject } from './object';

export class Text extends EchoObject<TextModel> {
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
    // TODO(dmaretskyi): Should accessing this re-render the react component?
    // this._database?._logObjectAccess(this);

    return this._model.textContent;
  }

  toJSON() {
    return {
      '@id': this.id,
      '@model': TextModel.meta.type,
      text: this.text
    };
  }

  protected override _afterBind() {
    this._model.initialize();
    // TODO(dmaretskyi): Unsubscribe.
    this._item!.subscribe(() => {
      this._model.initialize();
    });
  }
}

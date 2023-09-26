//
// Copyright 2022 DXOS.org
//

import { log } from '@dxos/log';
import { TextKind, TextMutation } from '@dxos/protocols/proto/dxos/echo/model/text';
import { TextModel, type YText, type YXmlFragment, type Doc } from '@dxos/text-model';

import { EchoObject } from './object';

// TODO(burdon): This can be used as a general YJS document (e.g., by the drawing-plugin).
//  So rethink how we expose this.
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
    this._signal?.notifyRead();
    return this._model?.doc;
  }

  get content(): YText | YXmlFragment | undefined {
    // TODO(dmaretskyi): Notify read?
    return this.model?.content;
  }

  get model(): TextModel | undefined {
    this._signal?.notifyRead();
    return this._model;
  }

  /**
   * Returns the text content of the object.
   */
  get text(): string {
    this._signal?.notifyRead();
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
    log('_afterBind', { id: this.id });
    this._model.initialize();
  }

  override _itemUpdate(): void {
    log('_itemUpdate', { id: this.id });
    super._itemUpdate();
    this._model.initialize();
    this._signal?.notifyWrite();
  }
}

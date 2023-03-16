//
// Copyright 2022 DXOS.org
//

import { TextModel, type Doc } from '@dxos/text-model';

import { EchoObject } from './object';

export class Text extends EchoObject<TextModel> {
  constructor(text?: string) {
    super(TextModel);
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

  get model(): TextModel | undefined {
    this._database?._logObjectAccess(this);
    return this._model;
  }

  /**
   * Returns the text content of the object.
   */
  get text(): string {
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

//
// Copyright 2022 DXOS.org
//

import { TextModel, type Doc } from '@dxos/text-model';

import { EchoObject } from './object';

export class Text extends EchoObject<TextModel> {
  constructor() {
    super(TextModel);
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
    // TODO(dmaretskyi): Should accessing this re-render the react component?
    // this._database?._logObjectAccess(this);

    return this._model.textContent
  }

  protected override async _onBind(): Promise<void> {
    this._model.initialize();
    // TODO(dmaretskyi): Unsubscribe.
    this._item!.subscribe(() => {
      this._model.initialize();
    });
  }
}

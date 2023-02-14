//
// Copyright 2022 DXOS.org
//

import { TextModel, type Doc } from '@dxos/text-model';

import { EchoObject } from './object';

export class TextObject extends EchoObject<TextModel> {
  constructor() {
    super(TextModel);
  }

  get doc(): Doc | undefined {
    this._database?._logObjectAccess(this);
    return this._model?.doc;
  }

  get model(): TextModel | undefined {
    this._database?._logObjectAccess(this);
    return this._model;
  }

  protected override async _onBind(): Promise<void> {
    this._model.initialize();
  }
}

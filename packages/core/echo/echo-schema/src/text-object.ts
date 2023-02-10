//
// Copyright 2022 DXOS.org
//

import { TextModel, type Doc } from '@dxos/text-model';

import { EchoObject } from './object';

export class TextObject extends EchoObject<TextModel> {
  override _modelConstructor = TextModel;

  get doc(): Doc | undefined {
    this._database?._logObjectAccess(this);
    return this._model?.doc;
  }

  get model(): TextModel | undefined {
    this._database?._logObjectAccess(this);
    return this._model;
  }
}

import { EchoObject } from "./object";
import { TextModel, type Doc } from '@dxos/text-model'
import { ModelConstructor } from "@dxos/model-factory";

export class TextObject extends EchoObject<TextModel> {
  override _modelConstructor = TextModel;

  get doc(): Doc | undefined {
    this._database?._logObjectAccess(this);
    return this._item?.model?.doc;
  }

  get model(): TextModel | undefined {
    this._database?._logObjectAccess(this);
    return this._item?.model;
  }
}
//
// Copyright 2023 DXOS.org
//

import { TLStore } from '@tldraw/tlschema';

import { TranslationsProvides } from '@braneframe/plugin-theme';
import { Drawing as DrawingType } from '@braneframe/types';
import { isTypedObject } from '@dxos/client/echo';

export type DrawingPluginProvides = TranslationsProvides;

export interface DrawingModel {
  object: DrawingType;
  store: TLStore;
}

export const isDrawing = (datum: unknown): datum is DrawingType => {
  return isTypedObject(datum) && DrawingType.type.name === datum.__typename;
};

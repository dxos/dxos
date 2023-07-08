//
// Copyright 2023 DXOS.org
//

import { SpaceProvides } from '@braneframe/plugin-space';
import { TranslationsProvides } from '@braneframe/plugin-theme';
import { Drawing as DrawingType } from '@braneframe/types';
import { isTypedObject } from '@dxos/client';

export type DrawingPluginProvides = SpaceProvides & TranslationsProvides;

export interface DrawingModel {
  root: DrawingType;
}

export const isDrawing = (datum: unknown): datum is DrawingType => {
  return isTypedObject(datum) && DrawingType.type.name === datum.__typename;
};

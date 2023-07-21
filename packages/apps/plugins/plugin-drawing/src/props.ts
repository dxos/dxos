//
// Copyright 2023 DXOS.org
//

import { TLStore } from '@tldraw/tlschema';

import type { GraphProvides } from '@braneframe/plugin-graph';
import { TranslationsProvides } from '@braneframe/plugin-theme';
import { Drawing as DrawingType } from '@braneframe/types';
import { isTypedObject } from '@dxos/client';

export const DRAWING_PLUGIN = 'dxos.org/plugin/drawing';

export type DrawingPluginProvides = GraphProvides & TranslationsProvides;

export interface DrawingModel {
  object: DrawingType;
  store: TLStore;
}

export const isDrawing = (datum: unknown): datum is DrawingType => {
  return isTypedObject(datum) && DrawingType.type.name === datum.__typename;
};

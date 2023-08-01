//
// Copyright 2023 DXOS.org
//

import { TLStore } from '@tldraw/tlschema';

import type { GraphProvides } from '@braneframe/plugin-graph';
import { IntentProvides } from '@braneframe/plugin-intent';
import { StackProvides } from '@braneframe/plugin-stack';
import { TranslationsProvides } from '@braneframe/plugin-theme';
import { Drawing as DrawingType } from '@braneframe/types';
import { isTypedObject } from '@dxos/client/echo';

export const DRAWING_PLUGIN = 'dxos.org/plugin/drawing';

const DRAWING_ACTION = `${DRAWING_PLUGIN}/action`;

export enum DrawingAction {
  CREATE = `${DRAWING_ACTION}/create`,
}

export type DrawingPluginProvides = GraphProvides & IntentProvides & TranslationsProvides & StackProvides;

export interface DrawingModel {
  store: TLStore;
}

export const isDrawing = (data: unknown): data is DrawingType => {
  return isTypedObject(data) && DrawingType.type.name === data.__typename;
};

//
// Copyright 2023 DXOS.org
//

import { CompassTool, Trash } from '@phosphor-icons/react';
import { TLStore } from '@tldraw/tlschema';
import get from 'lodash.get';
import React from 'react';

import type { GraphNode, GraphProvides } from '@braneframe/plugin-graph';
import { IntentProvides } from '@braneframe/plugin-intent';
import { SpaceAction } from '@braneframe/plugin-space';
import { TranslationsProvides } from '@braneframe/plugin-theme';
import { Drawing as DrawingType } from '@braneframe/types';
import { isTypedObject } from '@dxos/client/echo';

export const DRAWING_PLUGIN = 'dxos.org/plugin/drawing';

const DRAWING_ACTION = `${DRAWING_PLUGIN}/action`;
export enum DrawingAction {
  CREATE = `${DRAWING_ACTION}/create`,
}

export type DrawingPluginProvides = GraphProvides & IntentProvides & TranslationsProvides;

export interface DrawingModel {
  object: DrawingType;
  store: TLStore;
}

export const isDrawing = (data: unknown): data is DrawingType => {
  return isTypedObject(data) && DrawingType.type.name === data.__typename;
};

export const drawingToGraphNode = (parent: GraphNode, object: DrawingType, index: string): GraphNode => ({
  id: object.id,
  index: get(object, 'meta.index', index), // TODO(burdon): Data should not be on object?
  label: object.title ?? ['drawing title placeholder', { ns: DRAWING_PLUGIN }],
  icon: (props) => <CompassTool {...props} />,
  data: object,
  parent,
  pluginActions: {
    [DRAWING_PLUGIN]: [
      {
        id: 'delete',
        index: 'a1',
        label: ['delete drawing label', { ns: DRAWING_PLUGIN }],
        icon: (props) => <Trash {...props} />,
        intent: {
          action: SpaceAction.REMOVE_OBJECT,
          data: { spaceKey: parent.data?.key.toHex(), objectId: object.id },
        },
      },
    ],
  },
});

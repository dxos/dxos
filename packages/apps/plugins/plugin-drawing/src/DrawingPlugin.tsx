//
// Copyright 2023 DXOS.org
//

import { CompassTool, Plus } from '@phosphor-icons/react';
import React from 'react';

import { GraphNodeAdapter, SpaceAction, getIndices } from '@braneframe/plugin-space';
import { TreeViewAction } from '@braneframe/plugin-treeview';
import { Drawing as DrawingType } from '@braneframe/types';
import { SpaceProxy } from '@dxos/client/echo';
import { PluginDefinition } from '@dxos/react-surface';

import { DrawingMain, DrawingSection } from './components';
import translations from './translations';
import { isDrawing, DRAWING_PLUGIN, DrawingPluginProvides, DrawingAction } from './types';
import { objectToGraphNode } from './util';

// TODO(wittjosiah): This ensures that typed objects are not proxied by deepsignal. Remove.
// https://github.com/luisherranz/deepsignal/issues/36
(globalThis as any)[DrawingType.name] = DrawingType;

export const DrawingPlugin = (): PluginDefinition<DrawingPluginProvides> => {
  const adapter = new GraphNodeAdapter(DrawingType.filter(), objectToGraphNode);

  return {
    meta: {
      id: DRAWING_PLUGIN,
    },
    unload: async () => {
      adapter.clear();
    },
    provides: {
      translations,
      graph: {
        nodes: (parent, emit) => {
          if (!(parent.data instanceof SpaceProxy)) {
            return [];
          }

          const space = parent.data;
          return adapter.createNodes(space, parent, emit);
        },
        actions: (parent) => {
          if (!(parent.data instanceof SpaceProxy)) {
            return [];
          }

          return [
            {
              id: `${DRAWING_PLUGIN}/create-drawing`,
              index: getIndices(1)[0],
              testId: 'drawingPlugin.createDrawing',
              label: ['create drawing label', { ns: DRAWING_PLUGIN }],
              icon: (props) => <Plus {...props} />,
              intent: [
                {
                  plugin: DRAWING_PLUGIN,
                  action: DrawingAction.CREATE,
                },
                {
                  action: SpaceAction.ADD_OBJECT,
                  data: { spaceKey: parent.data.key.toHex() },
                },
                {
                  action: TreeViewAction.ACTIVATE,
                },
              ],
            },
          ];
        },
      },
      stack: {
        creators: [
          {
            id: 'create-stack-section-drawing', // TODO(burdon): "-space-" ?
            testId: 'drawingPlugin.createSectionSpaceDrawing',
            label: ['create stack section label', { ns: DRAWING_PLUGIN }],
            icon: (props: any) => <CompassTool {...props} />,
            intent: {
              plugin: DRAWING_PLUGIN,
              action: DrawingAction.CREATE,
            },
          },
        ],
        choosers: [
          {
            id: 'choose-stack-section-drawing', // TODO(burdon): Standardize.
            testId: 'drawingPlugin.createSectionSpaceDrawing',
            label: ['choose stack section label', { ns: DRAWING_PLUGIN }],
            icon: (props: any) => <CompassTool {...props} />,
            filter: isDrawing,
          },
        ],
      },
      component: (data, role) => {
        // TODO(burdon): SurfaceResolver error if component not defined.
        // TODO(burdon): Can we assume data has an object property?
        if (!data || typeof data !== 'object' || !('object' in data && isDrawing(data.object))) {
          return null;
        }

        switch (role) {
          case 'main':
            return DrawingMain;
          case 'section':
            return DrawingSection;
        }
      },
      components: {
        DrawingMain,
      },
      intent: {
        resolver: (intent) => {
          switch (intent.action) {
            case DrawingAction.CREATE: {
              return { object: new DrawingType() };
            }
          }
        },
      },
    },
  };
};

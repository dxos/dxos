//
// Copyright 2023 DXOS.org
//

import { CompassTool, Folder, Plus } from '@phosphor-icons/react';
import React from 'react';

import { GraphNodeAdapter, SpaceAction } from '@braneframe/plugin-space';
import { TreeViewAction } from '@braneframe/plugin-treeview';
import { Sketch as SketchType } from '@braneframe/types';
import { SpaceProxy } from '@dxos/client/echo';
import { PluginDefinition } from '@dxos/react-surface';

import { SketchMain, SketchSection } from './components';
import translations from './translations';
import { isSketch, SKETCH_PLUGIN, SketchPluginProvides, SketchAction } from './types';
import { objectToGraphNode } from './util';

export const SketchPlugin = (): PluginDefinition<SketchPluginProvides> => {
  const adapter = new GraphNodeAdapter({ filter: SketchType.filter(), adapter: objectToGraphNode });

  return {
    meta: {
      id: SKETCH_PLUGIN,
    },
    unload: async () => {
      adapter.clear();
    },
    provides: {
      translations,
      graph: {
        nodes: (parent) => {
          if (!(parent.data instanceof SpaceProxy)) {
            return;
          }

          const space = parent.data;

          const [presentationNode] = parent.add({
            id: `${SKETCH_PLUGIN}:${space.key.toHex()}`,
            label: ['plugin name', { ns: SKETCH_PLUGIN }],
            icon: (props) => <Folder {...props} />,
            properties: { palette: 'pink', childrenPersistenceClass: 'spaceObject', persistenceClass: 'appState' },
          });

          presentationNode.addAction({
            id: `${SKETCH_PLUGIN}/create`,
            label: ['create sketch label', { ns: SKETCH_PLUGIN }],
            icon: (props) => <Plus {...props} />,
            intent: [
              {
                plugin: SKETCH_PLUGIN,
                action: SketchAction.CREATE,
              },
              {
                action: SpaceAction.ADD_OBJECT,
                data: { spaceKey: parent.data.key.toHex() },
              },
              {
                action: TreeViewAction.ACTIVATE,
              },
            ],
            properties: {
              testId: 'sketchPlugin.createSketch',
            },
          });

          return adapter.createNodes(space, presentationNode);
        },
      },
      stack: {
        creators: [
          {
            id: 'create-stack-section-sketch',
            testId: 'sketchPlugin.createSectionSpaceSketch',
            label: ['create stack section label', { ns: SKETCH_PLUGIN }],
            icon: (props: any) => <CompassTool {...props} />,
            intent: {
              plugin: SKETCH_PLUGIN,
              action: SketchAction.CREATE,
            },
          },
        ],
        choosers: [
          {
            id: 'choose-stack-section-sketch', // TODO(burdon): Standardize.
            testId: 'sketchPlugin.createSectionSpaceSketch',
            label: ['choose stack section label', { ns: SKETCH_PLUGIN }],
            icon: (props: any) => <CompassTool {...props} />,
            filter: isSketch,
          },
        ],
      },
      component: (data, role) => {
        // TODO(burdon): SurfaceResolver error if component not defined.
        if (!data || typeof data !== 'object' || !isSketch(data)) {
          return null;
        }

        switch (role) {
          case 'main':
            return SketchMain;
          case 'section':
            return SketchSection;
        }
      },
      components: {
        SketchMain,
      },
      intent: {
        resolver: (intent) => {
          switch (intent.action) {
            case SketchAction.CREATE: {
              return { object: new SketchType() };
            }
          }
        },
      },
    },
  };
};

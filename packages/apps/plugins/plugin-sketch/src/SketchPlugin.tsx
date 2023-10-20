//
// Copyright 2023 DXOS.org
//

import { CompassTool, Plus } from '@phosphor-icons/react';
import React from 'react';

import { type IntentPluginProvides } from '@braneframe/plugin-intent';
import { GraphNodeAdapter, SpaceAction } from '@braneframe/plugin-space';
import { SplitViewAction } from '@braneframe/plugin-splitview';
import { Sketch as SketchType } from '@braneframe/types';
import { SpaceProxy } from '@dxos/client/echo';
import { findPlugin, type PluginDefinition } from '@dxos/react-surface';

import { SketchMain, SketchSection, SketchSlide } from './components';
import translations from './translations';
import { isSketch, SKETCH_PLUGIN, type SketchPluginProvides, SketchAction } from './types';
import { objectToGraphNode } from './util';

export const SketchPlugin = (): PluginDefinition<SketchPluginProvides> => {
  let adapter: GraphNodeAdapter<SketchType> | undefined;

  return {
    meta: {
      id: SKETCH_PLUGIN,
    },
    ready: async (plugins) => {
      // TODO(wittjosiah): Replace? Remove?
      // const dndPlugin = findPlugin<DndPluginProvides>(plugins, 'dxos.org/plugin/dnd');
      // if (dndPlugin && dndPlugin.provides.dnd?.onSetTileSubscriptions) {
      //   dndPlugin.provides.dnd.onSetTileSubscriptions.push((tile, node) => {
      //     if (isSketch(node.data)) {
      //       tile.copyClass = (tile.copyClass ?? new Set()).add('stack-section');
      //     }
      //     return tile;
      //   });
      // }
      const intentPlugin = findPlugin<IntentPluginProvides>(plugins, 'dxos.org/plugin/intent');
      const dispatch = intentPlugin?.provides.intent.dispatch;
      if (dispatch) {
        adapter = new GraphNodeAdapter({ dispatch, filter: SketchType.filter(), adapter: objectToGraphNode });
      }
    },
    unload: async () => {
      adapter?.clear();
    },
    provides: {
      translations,
      graph: {
        withPlugins: (plugins) => (parent) => {
          if (!(parent.data instanceof SpaceProxy)) {
            return;
          }

          const space = parent.data;
          const intentPlugin = findPlugin<IntentPluginProvides>(plugins, 'dxos.org/plugin/intent');

          parent.addAction({
            id: `${SKETCH_PLUGIN}/create`,
            label: ['create object label', { ns: SKETCH_PLUGIN }],
            icon: (props) => <Plus {...props} />,
            invoke: () =>
              intentPlugin?.provides.intent.dispatch([
                {
                  plugin: SKETCH_PLUGIN,
                  action: SketchAction.CREATE,
                },
                {
                  action: SpaceAction.ADD_OBJECT,
                  data: { spaceKey: parent.data.key.toHex() },
                },
                {
                  action: SplitViewAction.ACTIVATE,
                },
              ]),
            properties: {
              testId: 'sketchPlugin.createSketch',
            },
          });

          return adapter?.createNodes(space, parent);
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
          case 'presenter-slide':
            return SketchSlide;
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

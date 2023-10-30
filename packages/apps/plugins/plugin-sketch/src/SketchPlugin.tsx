//
// Copyright 2023 DXOS.org
//

import { CompassTool } from '@phosphor-icons/react';
import React from 'react';

import { GraphNodeAdapter, SpaceAction } from '@braneframe/plugin-space';
import { Sketch as SketchType } from '@braneframe/types';
import { resolvePlugin, type PluginDefinition, parseIntentPlugin, LayoutAction } from '@dxos/app-framework';
import { SpaceProxy } from '@dxos/client/echo';

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
      const intentPlugin = resolvePlugin(plugins, parseIntentPlugin);
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
        builder: ({ parent, plugins }) => {
          if (!(parent.data instanceof SpaceProxy)) {
            return;
          }

          const space = parent.data;
          const intentPlugin = resolvePlugin(plugins, parseIntentPlugin);

          parent.actionsMap['create-object-group']?.addAction({
            id: `${SKETCH_PLUGIN}/create`,
            label: ['create object label', { ns: SKETCH_PLUGIN }],
            icon: (props) => <CompassTool {...props} />,
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
                  action: LayoutAction.ACTIVATE,
                },
              ]),
            properties: {
              testId: 'sketchPlugin.createObject',
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
      surface: {
        component: (data, role) => {
          switch (role) {
            case 'main':
              return isSketch(data.active) ? <SketchMain sketch={data.active} /> : null;
            case 'section':
              return isSketch(data.object) ? <SketchSection sketch={data.object} /> : null;
            case 'slide':
              return isSketch(data.slide) ? <SketchSlide sketch={data.slide} /> : null;
            default:
              return null;
          }
        },
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

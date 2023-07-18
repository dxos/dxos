//
// Copyright 2023 DXOS.org
//

import { Plus } from '@phosphor-icons/react';
import React from 'react';

import { GraphNodeAdapter, SpaceAction } from '@braneframe/plugin-space';
import { TreeViewAction } from '@braneframe/plugin-treeview';
import { Stack as StackType } from '@braneframe/types';
import { SpaceProxy } from '@dxos/client/echo';
import { Plugin, PluginDefinition } from '@dxos/react-surface';

import { StackMain, StackSectionOverlay } from './components';
import { stackState } from './stores';
import translations from './translations';
import { STACK_PLUGIN, StackAction, StackPluginProvides, StackProvides } from './types';
import { isStack, stackToGraphNode } from './util';

export const StackPlugin = (): PluginDefinition<StackPluginProvides> => {
  const adapter = new GraphNodeAdapter(StackType.filter(), stackToGraphNode);

  return {
    meta: {
      id: STACK_PLUGIN,
    },
    ready: async (plugins) => {
      return plugins.forEach((plugin) => {
        if (Array.isArray((plugin as Plugin<StackProvides>).provides?.stack?.creators)) {
          stackState.creators = (plugin as Plugin<StackProvides>).provides.stack.creators;
        }
        if (Array.isArray((plugin as Plugin<StackProvides>).provides?.stack?.choosers)) {
          stackState.choosers = (plugin as Plugin<StackProvides>).provides.stack.choosers;
        }
      });
    },
    unload: async () => {
      adapter.clear();
    },
    provides: {
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
              id: 'create-stack',
              index: getIndices(1)[0],
              testId: 'stackPlugin.createStack',
              label: ['create stack label', { ns: STACK_PLUGIN }],
              icon: (props) => <Plus {...props} />,
              intent: [
                {
                  plugin: STACK_PLUGIN,
                  action: StackAction.CREATE,
                },
                {
                  action: SpaceAction.ADD_OBJECT,
                  data: { spaceKey: parent.data.key.toHex() },
                },
                {
                  action: TreeViewAction.SELECT,
                },
              ],
            },
          ];
        },
      },
      translations,
      component: (datum, role) => {
        switch (role) {
          case 'main':
            if (Array.isArray(datum) && isStack(datum[datum.length - 1])) {
              return StackMain;
            } else {
              return null;
            }
          case 'dragoverlay':
            if (datum && typeof datum === 'object' && 'object' in datum) {
              return StackSectionOverlay;
            } else {
              return null;
            }
          default:
            return null;
        }
      },
      components: {
        StackMain,
      },
      intent: {
        resolver: (intent) => {
          switch (intent.action) {
            case StackAction.CREATE: {
              return { object: new StackType() };
            }
          }
        },
      },
      stack: stackState,
    },
  };
};

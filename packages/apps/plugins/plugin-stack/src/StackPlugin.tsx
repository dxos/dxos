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

// TODO(wittjosiah): This ensures that typed objects are not proxied by deepsignal. Remove.
// https://github.com/luisherranz/deepsignal/issues/36
(globalThis as any)[StackType.name] = StackType;

export const StackPlugin = (): PluginDefinition<StackPluginProvides> => {
  const adapter = new GraphNodeAdapter(StackType.filter(), stackToGraphNode);

  return {
    meta: {
      id: STACK_PLUGIN,
    },
    ready: async (plugins) => {
      for (const plugin of plugins) {
        if (plugin.meta.id === STACK_PLUGIN) {
          continue;
        }

        if (Array.isArray((plugin as Plugin<StackProvides>).provides?.stack?.creators)) {
          stackState.creators.push(...((plugin as Plugin<StackProvides>).provides.stack.creators ?? []));
        }
        if (Array.isArray((plugin as Plugin<StackProvides>).provides?.stack?.choosers)) {
          stackState.choosers.push(...((plugin as Plugin<StackProvides>).provides.stack.choosers ?? []));
        }
      }
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

          return adapter.createNodes(parent.data, parent, emit);
        },
        actions: (parent) => {
          if (!(parent.data instanceof SpaceProxy)) {
            return [];
          }

          return [
            {
              id: `${STACK_PLUGIN}/create`,
              index: 'a1',
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
                  action: TreeViewAction.ACTIVATE,
                },
              ],
            },
          ];
        },
      },
      component: (data, role) => {
        if (!data || typeof data !== 'object') {
          return null;
        }

        switch (role) {
          case 'main':
            if ('object' in data && isStack(data.object)) {
              return StackMain;
            } else {
              return null;
            }
          case 'dragoverlay':
            if ('object' in data) {
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
      // TODO(burdon): Review with @thure (same variable used by other plugins to define the stack).
      stack: stackState,
    },
  };
};

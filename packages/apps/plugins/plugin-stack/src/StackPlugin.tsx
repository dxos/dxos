//
// Copyright 2023 DXOS.org
//

import { Plus } from '@phosphor-icons/react';
import React from 'react';

import { GraphNodeAdapter, SpaceAction } from '@braneframe/plugin-space';
import { TreeViewAction } from '@braneframe/plugin-treeview';
import { Stack as StackType } from '@braneframe/types';
import { parseDndId } from '@dxos/aurora-grid';
import { SpaceProxy } from '@dxos/client/echo';
import { Plugin, PluginDefinition } from '@dxos/react-surface';

import { StackMain, StackSectionDelegator } from './components';
import { stackState } from './stores';
import translations from './translations';
import { STACK_PLUGIN, StackAction, StackPluginProvides, StackProvides } from './types';
import { isStack, stackToGraphNode } from './util';

// TODO(wittjosiah): This ensures that typed objects are not proxied by deepsignal. Remove.
// https://github.com/luisherranz/deepsignal/issues/36
(globalThis as any)[StackType.name] = StackType;

export const StackPlugin = (): PluginDefinition<StackPluginProvides> => {
  const adapter = new GraphNodeAdapter({ filter: StackType.filter(), adapter: stackToGraphNode });

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
        // TODO(burdon): Remove?
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
        nodes: (parent) => {
          if (!(parent.data instanceof SpaceProxy)) {
            return;
          }

          const space = parent.data;

          parent.addAction({
            id: `${STACK_PLUGIN}/create`,
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
            properties: {
              testId: 'stackPlugin.createStack',
            },
          });

          return adapter.createNodes(space, parent);
        },
      },
      component: (data, role) => {
        if (!data || typeof data !== 'object') {
          return null;
        }

        switch (role) {
          case 'main':
            if (isStack(data)) {
              return StackMain;
            } else {
              return null;
            }
          case 'mosaic-delegator':
            if (
              'tile' in data &&
              typeof data.tile === 'object' &&
              !!data.tile &&
              'id' in data.tile &&
              parseDndId((data.tile.id as string) ?? '')[0] === STACK_PLUGIN
            ) {
              return StackSectionDelegator;
            } else {
              return null;
            }
          default:
            return null;
        }
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

//
// Copyright 2023 DXOS.org
//

import { Plus } from '@phosphor-icons/react';
import { deepSignal } from 'deepsignal/react';
import React from 'react';

import { GraphNodeAdapter, SpaceAction } from '@braneframe/plugin-space';
import { SplitViewAction } from '@braneframe/plugin-splitview';
import { Stack as StackType } from '@braneframe/types';
import { SpaceProxy } from '@dxos/client/echo';
import { type Plugin, type PluginDefinition } from '@dxos/react-surface';

import { StackMain } from './components';
import translations from './translations';
import { STACK_PLUGIN, StackAction, type StackState, type StackPluginProvides, type StackProvides } from './types';
import { isStack, stackToGraphNode } from './util';

// TODO(wittjosiah): This ensures that typed objects are not proxied by deepsignal. Remove.
// https://github.com/luisherranz/deepsignal/issues/36
(globalThis as any)[StackType.name] = StackType;

export const StackPlugin = (): PluginDefinition<StackPluginProvides> => {
  const stackState: StackState = deepSignal({ creators: [] });
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
                action: SplitViewAction.ACTIVATE,
              },
            ],
            properties: {
              testId: 'stackPlugin.createObject',
            },
          });

          return adapter.createNodes(space, parent);
        },
      },
      component: (data, role) => {
        if (!isStack(data)) {
          return null;
        }

        switch (role) {
          case 'main':
            return StackMain;

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
      stack: stackState,
    },
  };
};

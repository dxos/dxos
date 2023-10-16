//
// Copyright 2023 DXOS.org
//

import { Plus } from '@phosphor-icons/react';
import { deepSignal } from 'deepsignal/react';
import React from 'react';

import { GraphNodeAdapter, SpaceAction } from '@braneframe/plugin-space';
import { SplitViewAction } from '@braneframe/plugin-splitview';
import { Stack as StackType } from '@braneframe/types';
import { parseDndId } from '@dxos/aurora-grid';
import { SpaceProxy } from '@dxos/client/echo';
import { type Plugin, type PluginDefinition } from '@dxos/react-surface';

import { StackMain, StackSectionDelegator } from './components';
import translations from './translations';
import { STACK_PLUGIN, StackAction, type StackState, type StackPluginProvides, type StackProvides } from './types';
import { isStack, stackToGraphNode } from './util';

const STACK_PLUGIN_PREVIEW_SECTION = `preview--${STACK_PLUGIN}`;

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
            // TODO(burdon): Need stronger typing (vs. 'tile' in)?
            if ('tile' in data && typeof data.tile === 'object' && !!data.tile && 'id' in data.tile) {
              const mosaicId = parseDndId((data.tile.id as string) ?? '')[0];
              return mosaicId === STACK_PLUGIN || mosaicId === STACK_PLUGIN_PREVIEW_SECTION
                ? StackSectionDelegator
                : null;
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

//
// Copyright 2023 DXOS.org
//

import { StackSimple, type IconProps } from '@phosphor-icons/react';
import { deepSignal } from 'deepsignal/react';
import React from 'react';

import { SPACE_PLUGIN, SpaceAction } from '@braneframe/plugin-space';
import { Folder, Stack as StackType } from '@braneframe/types';
import {
  resolvePlugin,
  type Plugin,
  type PluginDefinition,
  parseIntentPlugin,
  LayoutAction,
} from '@dxos/app-framework';
import { SpaceProxy } from '@dxos/react-client/echo';

import { StackMain } from './components';
import meta, { STACK_PLUGIN } from './meta';
import translations from './translations';
import { StackAction, isStack, type StackPluginProvides, type StackProvides, type StackState } from './types';

// TODO(wittjosiah): This ensures that typed objects are not proxied by deepsignal. Remove.
// https://github.com/luisherranz/deepsignal/issues/36
(globalThis as any)[StackType.name] = StackType;

export const StackPlugin = (): PluginDefinition<StackPluginProvides> => {
  const stackState: StackState = deepSignal({ creators: [] });

  return {
    meta,
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
    provides: {
      metadata: {
        records: {
          [StackType.schema.typename]: {
            placeholder: ['stack title placeholder', { ns: STACK_PLUGIN }],
            icon: (props: IconProps) => <StackSimple {...props} />,
          },
        },
      },
      translations,
      graph: {
        builder: ({ parent, plugins }) => {
          if (!(parent.data instanceof Folder || parent.data instanceof SpaceProxy)) {
            return;
          }

          const intentPlugin = resolvePlugin(plugins, parseIntentPlugin);

          parent.actionsMap[`${SPACE_PLUGIN}/create`]?.addAction({
            id: `${STACK_PLUGIN}/create`,
            label: ['create stack label', { ns: STACK_PLUGIN }],
            icon: (props) => <StackSimple {...props} />,
            invoke: () =>
              intentPlugin?.provides.intent.dispatch([
                {
                  plugin: STACK_PLUGIN,
                  action: StackAction.CREATE,
                },
                {
                  action: SpaceAction.ADD_OBJECT,
                  data: { target: parent.data },
                },
                {
                  action: LayoutAction.ACTIVATE,
                },
              ]),
            properties: {
              testId: 'stackPlugin.createObject',
            },
          });
        },
      },
      surface: {
        component: ({ data, role }) => {
          if (!isStack(data.active)) {
            return null;
          }

          switch (role) {
            case 'main':
              return <StackMain stack={data.active} />;

            default:
              return null;
          }
        },
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

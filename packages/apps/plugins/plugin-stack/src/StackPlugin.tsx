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
  NavigationAction,
} from '@dxos/app-framework';
import { LocalStorageStore } from '@dxos/local-storage';
import { SpaceProxy } from '@dxos/react-client/echo';

import { StackMain, StackSettings } from './components';
import meta, { STACK_PLUGIN } from './meta';
import translations from './translations';
import {
  StackAction,
  isStack,
  type StackPluginProvides,
  type StackProvides,
  type StackState,
  type StackSettingsProps,
} from './types';

export const StackPlugin = (): PluginDefinition<StackPluginProvides> => {
  const settings = new LocalStorageStore<StackSettingsProps>(STACK_PLUGIN, { separation: true });
  const stackState: StackState = deepSignal({ creators: [] });

  return {
    meta,
    ready: async (plugins) => {
      settings.prop('separation', LocalStorageStore.bool());

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
      settings: settings.values,
      metadata: {
        records: {
          [StackType.schema.typename]: {
            placeholder: ['stack title placeholder', { ns: STACK_PLUGIN }],
            icon: (props: IconProps) => <StackSimple {...props} />,
          },
          [StackType.Section.schema.typename]: {
            parse: (section: StackType.Section, type: string) => {
              switch (type) {
                case 'node':
                  return { id: section.object.id, label: section.object.title, data: section.object };
                case 'object':
                  return section.object;
                case 'view-object':
                  return section;
              }
            },
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
                  action: NavigationAction.ACTIVATE,
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
          switch (role) {
            case 'main':
              return isStack(data.active) ? (
                <StackMain stack={data.active} separation={settings.values.separation} />
              ) : null;
            case 'settings': {
              return data.plugin === meta.id ? <StackSettings settings={settings.values} /> : null;
            }
            default:
              return null;
          }
        },
      },
      intent: {
        resolver: (intent) => {
          switch (intent.action) {
            case StackAction.CREATE: {
              return { data: new StackType() };
            }
          }
        },
      },
      stack: stackState,
    },
  };
};

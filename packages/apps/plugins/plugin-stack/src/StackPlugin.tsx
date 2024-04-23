//
// Copyright 2023 DXOS.org
//

import { StackSimple, type IconProps } from '@phosphor-icons/react';
import React from 'react';

import { Section, StackView } from '@braneframe/types';
import { type Plugin, type PluginDefinition } from '@dxos/app-framework';
import { create } from '@dxos/echo-schema';
import { type EchoReactiveObject } from '@dxos/echo-schema';
import { LocalStorageStore } from '@dxos/local-storage';

import { StackMain, StackSettings, AddSectionDialog, dataHasAddSectionDialogProps } from './components';
import meta, { STACK_PLUGIN } from './meta';
import translations from './translations';
import { type StackPluginProvides, type StackProvides, type StackState, type StackSettingsProps } from './types';

export const StackPlugin = (): PluginDefinition<StackPluginProvides> => {
  const settings = new LocalStorageStore<StackSettingsProps>(STACK_PLUGIN, { separation: true });
  const stackState = create<StackState>({ creators: [] });

  return {
    meta,
    ready: async (plugins) => {
      settings.prop({ key: 'separation', type: LocalStorageStore.bool() });

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
          [StackView.typename]: {
            placeholder: ['stack title placeholder', { ns: STACK_PLUGIN }],
            icon: (props: IconProps) => <StackSimple {...props} />,
          },
          [Section.identifier]: {
            parse: (object: EchoReactiveObject<any>, type: string) => {
              switch (type) {
                case 'node':
                  // TODO(wittjosiah): Remove cast.
                  return { id: object.id, label: object.title, data: object };
                case 'object':
                  return object;
              }
            },
          },
        },
      },
      translations,
      echo: {
        schema: [StackView],
      },
      surface: {
        component: ({ data, role }) => {
          switch (data.component) {
            case `${STACK_PLUGIN}/AddSectionDialog`:
              return dataHasAddSectionDialogProps(data) ? <AddSectionDialog {...data.subject} /> : null;
          }
          switch (role) {
            case 'main':
              return data.active instanceof StackView ? (
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
      stack: stackState,
    },
  };
};

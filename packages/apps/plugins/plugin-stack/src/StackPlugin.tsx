//
// Copyright 2023 DXOS.org
//

import { StackSimple, type IconProps } from '@phosphor-icons/react';
import React from 'react';

import { CollectionType, StackViewType } from '@braneframe/types';
import { type Plugin, type PluginDefinition } from '@dxos/app-framework';
import { create } from '@dxos/echo-schema';
import { type EchoReactiveObject } from '@dxos/echo-schema';
import { LocalStorageStore } from '@dxos/local-storage';
import { Main } from '@dxos/react-ui';
import { baseSurface, topbarBlockPaddingStart, bottombarBlockPaddingEnd } from '@dxos/react-ui-theme';

import { StackMain, StackSettings, AddSectionDialog, dataHasAddSectionDialogProps } from './components';
import meta, { SECTION_IDENTIFIER, STACK_PLUGIN } from './meta';
import translations from './translations';
import { type StackPluginProvides, type StackProvides, type StackState, type StackSettingsProps } from './types';

export const StackPlugin = (): PluginDefinition<StackPluginProvides> => {
  const settings = new LocalStorageStore<StackSettingsProps>(STACK_PLUGIN, { separation: true });
  const stackState = create<StackState>({ creators: [] });
  let subscription: UnsubscribeCallback;

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
    unload: async () => {
      subscription?.();
    },
    provides: {
      settings: settings.values,
      metadata: {
        records: {
          [StackViewType.typename]: {
            placeholder: ['stack title placeholder', { ns: STACK_PLUGIN }],
            icon: (props: IconProps) => <StackSimple {...props} />,
          },
          [SECTION_IDENTIFIER]: {
            parse: (section: { object: EchoReactiveObject<any> }, type: string) => {
              switch (type) {
                case 'node':
                  // TODO(wittjosiah): Remove cast.
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
      echo: {
        schema: [StackViewType],
      },
      surface: {
        component: ({ data, role }) => {
          switch (data.component) {
            case `${STACK_PLUGIN}/AddSectionDialog`:
              return dataHasAddSectionDialogProps(data) ? <AddSectionDialog {...data.subject} /> : null;
          }
          switch (role) {
            case 'main':
              return data.active instanceof CollectionType ? (
                <Main.Content bounce classNames={[baseSurface, topbarBlockPaddingStart, bottombarBlockPaddingEnd]}>
                  <StackMain collection={data.active} separation={settings.values.separation} />
                </Main.Content>
              ) : null;
            case 'article':
              return data.object instanceof CollectionType ? (
                <div role='none' className='row-span-2 overflow-auto'>
                  <StackMain collection={data.object} separation={settings.values.separation} />
                </div>
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

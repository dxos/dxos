//
// Copyright 2023 DXOS.org
//

import React from 'react';

import { createSurface, type Plugin, type PluginDefinition } from '@dxos/app-framework';
import { create, type ReactiveEchoObject, fullyQualifiedId } from '@dxos/client/echo';
import { LocalStorageStore } from '@dxos/local-storage';
import { CollectionType } from '@dxos/plugin-space/types';

import {
  StackMain,
  StackSettings,
  AddSectionDialog,
  dataHasAddSectionDialogProps,
  ADD_SECTION_DIALOG,
  type AddSectionDialogProps,
} from './components';
import meta, { SECTION_IDENTIFIER, STACK_PLUGIN } from './meta';
import translations from './translations';
import { StackViewType } from './types';
import { type StackPluginProvides, type StackProvides, type StackState, type StackSettingsProps } from './types';

export const StackPlugin = (): PluginDefinition<StackPluginProvides> => {
  const settings = new LocalStorageStore<StackSettingsProps>(STACK_PLUGIN, { separation: true });
  const stackState = create<StackState>({ creators: [] });

  return {
    meta,
    ready: async ({ plugins }) => {
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
          [StackViewType.typename]: {
            placeholder: ['stack title placeholder', { ns: STACK_PLUGIN }],
            icon: 'ph--stack-simple--regular',
          },
          [SECTION_IDENTIFIER]: {
            parse: (section: { object: ReactiveEchoObject<any> }, type: string) => {
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
        system: [StackViewType],
      },
      surface: {
        definitions: () => [
          createSurface({
            id: ADD_SECTION_DIALOG,
            role: 'dialog',
            filter: (data): data is { subject: AddSectionDialogProps } =>
              data.component === ADD_SECTION_DIALOG && dataHasAddSectionDialogProps(data),
            component: ({ data }) => <AddSectionDialog {...data.subject} />,
          }),
          createSurface({
            id: `${STACK_PLUGIN}/article`,
            role: 'article',
            filter: (data): data is { id?: string; object: CollectionType } => data.object instanceof CollectionType,
            component: ({ data }) => {
              // This allows the id to be overridden by the surface for situations where the id of the collection
              // is not the same as the id of what is being represented (e.g., a space with a root collection).
              const id = typeof data.id === 'string' ? data.id : undefined;
              return (
                <div role='none' className='overflow-auto' style={{ contain: 'layout' }}>
                  <StackMain id={id ?? fullyQualifiedId(data.object)} collection={data.object} />
                </div>
              );
            },
          }),
          createSurface({
            id: `${STACK_PLUGIN}/settings`,
            role: 'settings',
            filter: (data): data is any => data.plugin === meta.id,
            component: () => <StackSettings settings={settings.values} />,
          }),
        ],
      },
      stack: stackState,
    },
  };
};

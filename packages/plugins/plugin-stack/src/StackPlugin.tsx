//
// Copyright 2023 DXOS.org
//

import React from 'react';

import { createSurface, type PluginDefinition } from '@dxos/app-framework';
import { type ReactiveEchoObject, fullyQualifiedId } from '@dxos/client/echo';
import { LocalStorageStore } from '@dxos/local-storage';
import { CollectionType } from '@dxos/plugin-space/types';

import { StackMain, StackSettings } from './components';
import meta, { SECTION_IDENTIFIER, STACK_PLUGIN } from './meta';
import translations from './translations';
import { StackViewType } from './types';
import { type StackPluginProvides, type StackSettingsProps } from './types';

export const StackPlugin = (): PluginDefinition<StackPluginProvides> => {
  const settings = new LocalStorageStore<StackSettingsProps>(STACK_PLUGIN, { separation: true });

  return {
    meta,
    ready: async () => {
      settings.prop({ key: 'separation', type: LocalStorageStore.bool() });
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
            id: `${STACK_PLUGIN}/article`,
            role: 'article',
            filter: (data): data is { id?: string; subject: CollectionType } => data.subject instanceof CollectionType,
            component: ({ data }) => {
              // This allows the id to be overridden by the surface for situations where the id of the collection
              // is not the same as the id of what is being represented (e.g., a space with a root collection).
              const id = typeof data.id === 'string' ? data.id : undefined;
              return (
                <div role='none' className='overflow-auto' style={{ contain: 'layout' }}>
                  <StackMain id={id ?? fullyQualifiedId(data.subject)} collection={data.subject} />
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
    },
  };
};

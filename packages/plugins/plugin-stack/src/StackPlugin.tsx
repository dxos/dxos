//
// Copyright 2023 DXOS.org
//

import React from 'react';

import { Capabilities, contributes, createSurface, defineModule, definePlugin, Events } from '@dxos/app-framework';
import { type ReactiveEchoObject, fullyQualifiedId } from '@dxos/client/echo';
import { ClientCapabilities, ClientEvents } from '@dxos/plugin-client';
import { CollectionType } from '@dxos/plugin-space/types';

import { StackMain } from './components';
import { meta, SECTION_IDENTIFIER, STACK_PLUGIN } from './meta';
import translations from './translations';
import { StackViewType } from './types';

export const StackPlugin = () =>
  definePlugin(meta, [
    defineModule({
      id: `${meta.id}/module/translations`,
      activatesOn: Events.SetupTranslations,
      activate: () => contributes(Capabilities.Translations, translations),
    }),
    defineModule({
      id: `${meta.id}/module/metadata`,
      activatesOn: Events.Startup,
      activate: () => [
        contributes(Capabilities.Metadata, {
          id: StackViewType.typename,
          metadata: {
            placeholder: ['stack title placeholder', { ns: STACK_PLUGIN }],
            icon: 'ph--stack-simple--regular',
          },
        }),
        contributes(Capabilities.Metadata, {
          id: SECTION_IDENTIFIER,
          metadata: {
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
        }),
      ],
    }),
    defineModule({
      id: `${meta.id}/module/schema`,
      activatesOn: ClientEvents.SetupClient,
      activate: () => contributes(ClientCapabilities.SystemSchema, [StackViewType]),
    }),
    defineModule({
      id: `${meta.id}/module/react-surface`,
      activatesOn: Events.Startup,
      activate: () =>
        contributes(
          Capabilities.ReactSurface,
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
        ),
    }),
  ]);

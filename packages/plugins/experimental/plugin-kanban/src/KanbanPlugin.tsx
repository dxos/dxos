//
// Copyright 2023 DXOS.org
//

import React from 'react';

import { type PluginDefinition, createSurface, createIntent, createResolver } from '@dxos/app-framework';
import { create } from '@dxos/live-object';
import { loadObjectReferences } from '@dxos/react-client/echo';

import { KanbanMain } from './components';
import meta, { KANBAN_PLUGIN } from './meta';
import translations from './translations';
import { KanbanColumnType, KanbanItemType, KanbanType } from './types';
import { KanbanAction, type KanbanPluginProvides } from './types';

export const KanbanPlugin = (): PluginDefinition<KanbanPluginProvides> => {
  return {
    meta,
    provides: {
      metadata: {
        records: {
          [KanbanType.typename]: {
            createObject: (props: { name?: string }) => createIntent(KanbanAction.Create, props),
            placeholder: ['kanban title placeholder', { ns: KANBAN_PLUGIN }],
            icon: 'ph--kanban--regular',
            // TODO(wittjosiah): Move out of metadata.
            loadReferences: (kanban: KanbanType) => loadObjectReferences(kanban, (kanban) => kanban.columns),
          },
          [KanbanColumnType.typename]: {
            // TODO(wittjosiah): Move out of metadata.
            loadReferences: (column: KanbanColumnType) => loadObjectReferences(column, (column) => column.items),
          },
          [KanbanItemType.typename]: {
            // TODO(wittjosiah): Move out of metadata.
            loadReferences: (item: KanbanItemType) => [], // loadObjectReferences(item, (item) => item.object),
          },
        },
      },
      echo: {
        schema: [KanbanType],
        system: [KanbanColumnType, KanbanItemType],
      },
      translations,
      surface: {
        definitions: () =>
          createSurface({
            id: KANBAN_PLUGIN,
            role: 'article',
            filter: (data): data is { subject: KanbanType } => data.subject instanceof KanbanType,
            component: ({ data }) => <KanbanMain kanban={data.subject} />,
          }),
      },
      intent: {
        resolvers: () =>
          createResolver(KanbanAction.Create, ({ name }) => ({
            data: { object: create(KanbanType, { name, columns: [] }) },
          })),
      },
    },
  };
};

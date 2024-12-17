//
// Copyright 2023 DXOS.org
//

import React from 'react';

import { type PluginDefinition, createSurface, createIntent, createResolver } from '@dxos/app-framework';
import { type Space } from '@dxos/react-client/echo';
import { KanbanType } from '@dxos/react-ui-kanban';

import { KanbanContainer } from './components';
import { createKanban } from './components/create-kanban';
import meta, { KANBAN_PLUGIN } from './meta';
import translations from './translations';
import { KanbanAction, type KanbanPluginProvides } from './types';

export const KanbanPlugin = (): PluginDefinition<KanbanPluginProvides> => {
  return {
    meta,
    provides: {
      metadata: {
        records: {
          [KanbanType.typename]: {
            createObject: (props: { name?: string, space: Space }) => createIntent(KanbanAction.Create, props),
            placeholder: ['kanban title placeholder', { ns: KANBAN_PLUGIN }],
            icon: 'ph--kanban--regular',
          },
        },
      },
      echo: {
        schema: [KanbanType],
      },
      translations,
      surface: {
        definitions: () =>
          createSurface({
            id: KANBAN_PLUGIN,
            role: 'article',
            filter: (data): data is { subject: KanbanType } => data.subject instanceof KanbanType,
            component: ({ data, role }) => <KanbanContainer kanban={data.subject} role={role} />,
          }),
      },
      intent: {
        resolvers: () =>
          createResolver(KanbanAction.Create, ({ space }) => ({
            data: { object: createKanban(space) },
          })),
      },
    },
  };
};

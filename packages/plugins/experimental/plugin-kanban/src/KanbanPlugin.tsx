//
// Copyright 2023 DXOS.org
//

import React from 'react';

import { type PluginDefinition, createSurface, createIntent, createResolver } from '@dxos/app-framework';
import { invariant } from '@dxos/invariant';
import { getSpace, type Space } from '@dxos/react-client/echo';
import { KanbanType, translations as kanbanTranslations } from '@dxos/react-ui-kanban';
import { ViewProjection } from '@dxos/schema';

import { KanbanContainer } from './components';
import KanbanViewEditor from './components/KanbanViewEditor';
import meta, { KANBAN_PLUGIN } from './meta';
import translations from './translations';
import { isKanban, KanbanAction, type KanbanPluginProvides, createKanban } from './types';

export const KanbanPlugin = (): PluginDefinition<KanbanPluginProvides> => {
  return {
    meta,
    provides: {
      metadata: {
        records: {
          [KanbanType.typename]: {
            createObject: (props: { name?: string; space: Space }) => createIntent(KanbanAction.Create, props),
            placeholder: ['kanban title placeholder', { ns: KANBAN_PLUGIN }],
            icon: 'ph--kanban--regular',
          },
        },
      },
      echo: {
        schema: [KanbanType],
      },
      translations: [...translations, ...kanbanTranslations],
      surface: {
        definitions: () => [
          createSurface({
            id: `${KANBAN_PLUGIN}/kanban`,
            role: ['article', 'section'],
            filter: (data): data is { subject: KanbanType } => isKanban(data.subject),
            component: ({ data, role }) => <KanbanContainer kanban={data.subject} role={role} />,
          }),
          createSurface({
            id: `${KANBAN_PLUGIN}/settings`,
            role: 'complementary--settings',
            filter: (data): data is { subject: KanbanType } => isKanban(data.subject),
            component: ({ data }) => <KanbanViewEditor kanban={data.subject} />,
          }),
        ],
      },
      intent: {
        resolvers: () => [
          createResolver(KanbanAction.Create, ({ space }) => ({
            data: { object: createKanban(space) },
          })),
          createResolver(KanbanAction.DeleteCardField, ({ kanban, fieldId, deletionData }, undo) => {
            invariant(kanban.cardView);

            const schema =
              kanban.cardView.target &&
              getSpace(kanban)?.db.schemaRegistry.getSchema(kanban.cardView.target.query.type);
            invariant(schema);
            const projection = new ViewProjection(schema, kanban.cardView.target!);

            if (!undo) {
              const { deleted, index } = projection.deleteFieldProjection(fieldId);
              return {
                undoable: {
                  message: translations[0]['en-US'][KANBAN_PLUGIN]['card field deleted label'],
                  data: { deletionData: { ...deleted, index } },
                },
              };
            } else if (undo && deletionData) {
              const { field, props, index } = deletionData;
              projection.setFieldProjection({ field, props }, index);
            }
          }),
        ],
      },
    },
  };
};

//
// Copyright 2023 DXOS.org
//

import { type IconProps, Kanban } from '@phosphor-icons/react';
import React from 'react';

import { SPACE_PLUGIN, SpaceAction } from '@braneframe/plugin-space';
import { Folder, Kanban as KanbanType } from '@braneframe/types';
import { resolvePlugin, type PluginDefinition, parseIntentPlugin, NavigationAction } from '@dxos/app-framework';
import { SpaceProxy } from '@dxos/react-client/echo';

import { KanbanMain } from './components';
import meta, { KANBAN_PLUGIN } from './meta';
import translations from './translations';
import { KanbanAction, type KanbanPluginProvides, isKanban } from './types';

export const KanbanPlugin = (): PluginDefinition<KanbanPluginProvides> => {
  return {
    meta,
    provides: {
      metadata: {
        records: {
          [KanbanType.schema.typename]: {
            placeholder: ['kanban title placeholder', { ns: KANBAN_PLUGIN }],
            icon: (props: IconProps) => <Kanban {...props} />,
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
            id: `${KANBAN_PLUGIN}/create`,
            label: ['create kanban label', { ns: KANBAN_PLUGIN }],
            icon: (props) => <Kanban {...props} />,
            invoke: () =>
              intentPlugin?.provides.intent.dispatch([
                {
                  plugin: KANBAN_PLUGIN,
                  action: KanbanAction.CREATE,
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
              testId: 'kanbanPlugin.createObject',
            },
          });
        },
      },
      surface: {
        component: ({ data, role }) => {
          switch (role) {
            case 'main':
              return isKanban(data.active) ? <KanbanMain kanban={data.active} /> : null;
            default:
              return null;
          }
        },
      },
      intent: {
        resolver: (intent) => {
          switch (intent.action) {
            case KanbanAction.CREATE: {
              return { data: new KanbanType() };
            }
          }
        },
      },
    },
  };
};

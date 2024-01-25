//
// Copyright 2023 DXOS.org
//

import { Graph, type IconProps } from '@phosphor-icons/react';
import React from 'react';

import { SPACE_PLUGIN, SpaceAction } from '@braneframe/plugin-space';
import { Folder, View as ViewType } from '@braneframe/types';
import { parseIntentPlugin, resolvePlugin, type PluginDefinition, LayoutAction } from '@dxos/app-framework';
import { SpaceProxy } from '@dxos/react-client/echo';

import { ExplorerMain } from './components';
import meta, { EXPLORER_PLUGIN } from './meta';
import translations from './translations';
import { ExplorerAction, type ExplorerPluginProvides, isExplorer } from './types';

export const ExplorerPlugin = (): PluginDefinition<ExplorerPluginProvides> => {
  return {
    meta,
    provides: {
      metadata: {
        records: {
          [ViewType.schema.typename]: {
            placeholder: ['object title placeholder', { ns: EXPLORER_PLUGIN }],
            icon: (props: IconProps) => <Graph {...props} />,
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
            id: `${EXPLORER_PLUGIN}/create`,
            label: ['create object label', { ns: EXPLORER_PLUGIN }],
            icon: (props) => <Graph {...props} />,
            invoke: () =>
              intentPlugin?.provides.intent.dispatch([
                {
                  plugin: EXPLORER_PLUGIN,
                  action: ExplorerAction.CREATE,
                },
                {
                  action: SpaceAction.ADD_OBJECT,
                  data: { target: parent.data },
                },
                {
                  action: LayoutAction.ACTIVATE,
                },
              ]),
            properties: {
              testId: 'explorerPlugin.createObject',
            },
          });
        },
      },
      surface: {
        component: ({ data, role }) => {
          switch (role) {
            case 'main':
              return isExplorer(data.active) ? <ExplorerMain view={data.active} /> : null;
            default:
              return null;
          }
        },
      },
      intent: {
        resolver: (intent) => {
          switch (intent.action) {
            case ExplorerAction.CREATE: {
              return { data: new ViewType() };
            }
          }
        },
      },
    },
  };
};

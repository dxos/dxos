//
// Copyright 2023 DXOS.org
//

import { Plus } from '@phosphor-icons/react';
import React from 'react';

import { GraphNodeAdapter, SpaceAction } from '@braneframe/plugin-space';
import { SplitViewAction } from '@braneframe/plugin-splitview';
import { View as ViewType } from '@braneframe/types';
import { SpaceProxy } from '@dxos/client/echo';
import { type PluginDefinition } from '@dxos/app-framework';

import { ExplorerMain } from './components';
import translations from './translations';
import { EXPLORER_PLUGIN, ExplorerAction, type ExplorerPluginProvides, isExplorer } from './types';
import { objectToGraphNode } from './util';

export const ExplorerPlugin = (): PluginDefinition<ExplorerPluginProvides> => {
  const adapter = new GraphNodeAdapter({ filter: ViewType.filter(), adapter: objectToGraphNode });

  return {
    meta: {
      id: EXPLORER_PLUGIN,
    },
    provides: {
      translations,
      graph: {
        nodes: (parent) => {
          if (!(parent.data instanceof SpaceProxy)) {
            return;
          }

          const space = parent.data;

          // TODO(burdon): Util.
          parent.addAction({
            id: `${EXPLORER_PLUGIN}/create`,
            label: ['create object label', { ns: EXPLORER_PLUGIN }],
            icon: (props) => <Plus {...props} />,
            intent: [
              {
                plugin: EXPLORER_PLUGIN,
                action: ExplorerAction.CREATE,
              },
              {
                action: SpaceAction.ADD_OBJECT,
                data: { spaceKey: parent.data.key.toHex() },
              },
              {
                action: SplitViewAction.ACTIVATE,
              },
            ],
            properties: {
              testId: 'explorerPlugin.createObject',
            },
          });

          return adapter.createNodes(space, parent);
        },
      },
      component: (data, role) => {
        if (!data || typeof data !== 'object' || !isExplorer(data)) {
          return null;
        }

        switch (role) {
          case 'main':
            return ExplorerMain;
          default:
            return null;
        }
      },
      components: {
        ExplorerMain,
      },
      intent: {
        resolver: (intent) => {
          switch (intent.action) {
            case ExplorerAction.CREATE: {
              return { object: new ViewType() };
            }
          }
        },
      },
    },
  };
};

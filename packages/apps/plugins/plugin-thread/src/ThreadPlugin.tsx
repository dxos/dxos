//
// Copyright 2023 DXOS.org
//

import { Plus } from '@phosphor-icons/react';
import React from 'react';

import { GraphNodeAdapter, SpaceAction, getIndices } from '@braneframe/plugin-space';
import { TreeViewAction } from '@braneframe/plugin-treeview';
import { Thread as ThreadType } from '@braneframe/types';
import { SpaceProxy } from '@dxos/react-client/echo';
import { PluginDefinition } from '@dxos/react-surface';

import { ThreadMain } from './components';
import { isThread, THREAD_PLUGIN, ThreadAction, ThreadPluginProvides, threadToGraphNode } from './props';
import translations from './translations';

export const ThreadPlugin = (): PluginDefinition<ThreadPluginProvides> => {
  const adapter = new GraphNodeAdapter(ThreadType.filter(), threadToGraphNode);

  return {
    meta: {
      id: THREAD_PLUGIN,
    },
    unload: async () => {
      adapter.clear();
    },
    provides: {
      translations,
      graph: {
        nodes: (parent, emit) => {
          if (!(parent.data instanceof SpaceProxy)) {
            return [];
          }

          const space = parent.data;
          return adapter.createNodes(space, parent, emit);
        },
        actions: (parent) => {
          if (!(parent.data instanceof SpaceProxy)) {
            return [];
          }

          return [
            {
              id: `${THREAD_PLUGIN}/create-thread`, // TODO(burdon): Namespace?
              index: getIndices(1)[0],
              testId: 'threadPlugin.createThread', // TODO(burdon): Namespace?
              label: ['create thread label', { ns: THREAD_PLUGIN }],
              icon: (props) => <Plus {...props} />,
              intent: [
                {
                  plugin: THREAD_PLUGIN,
                  action: ThreadAction.CREATE,
                },
                {
                  action: SpaceAction.ADD_OBJECT,
                  data: { spaceKey: parent.data.key.toHex() },
                },
                {
                  action: TreeViewAction.SELECT,
                },
              ],
            },
          ];
        },
      },
      component: (datum, role) => {
        switch (role) {
          case 'main':
            if (Array.isArray(datum) && isThread(datum[datum.length - 1])) {
              return ThreadMain;
            } else {
              return null;
            }
          default:
            return null;
        }
      },
      components: {
        ThreadMain,
      },
      intent: {
        resolver: (intent) => {
          switch (intent.action) {
            case ThreadAction.CREATE: {
              return { object: new ThreadType() };
            }
          }
        },
      },
    },
  };
};

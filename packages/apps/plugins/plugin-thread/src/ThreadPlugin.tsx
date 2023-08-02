//
// Copyright 2023 DXOS.org
//

import { Plus } from '@phosphor-icons/react';
import React from 'react';

import { GraphNodeAdapter, SpaceAction } from '@braneframe/plugin-space';
import { TreeViewAction } from '@braneframe/plugin-treeview';
import { Thread as ThreadType } from '@braneframe/types';
import { SpaceProxy } from '@dxos/react-client/echo';
import { PluginDefinition } from '@dxos/react-surface';

import { ThreadMain } from './components';
import translations from './translations';
import { isThread, THREAD_PLUGIN, ThreadAction, ThreadPluginProvides } from './types';
import { objectToGraphNode } from './util';

// TODO(wittjosiah): This ensures that typed objects are not proxied by deepsignal. Remove.
// https://github.com/luisherranz/deepsignal/issues/36
(globalThis as any)[ThreadType.name] = ThreadType;

export const ThreadPlugin = (): PluginDefinition<ThreadPluginProvides> => {
  const adapter = new GraphNodeAdapter(ThreadType.filter(), objectToGraphNode);

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
              id: `${THREAD_PLUGIN}/create`,
              index: 'a1',
              testId: 'threadPlugin.createThread',
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
                  action: TreeViewAction.ACTIVATE,
                },
              ],
            },
          ];
        },
      },
      component: (data, role) => {
        if (!data || typeof data !== 'object' || !('object' in data && isThread(data.object))) {
          return null;
        }

        switch (role) {
          case 'main':
            return ThreadMain;
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

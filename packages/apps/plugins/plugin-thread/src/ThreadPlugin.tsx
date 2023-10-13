//
// Copyright 2023 DXOS.org
//

import { Plus } from '@phosphor-icons/react';
import React from 'react';

import { GraphNodeAdapter, SpaceAction } from '@braneframe/plugin-space';
import { SplitViewAction } from '@braneframe/plugin-splitview';
import { Thread as ThreadType } from '@braneframe/types';
import { SpaceProxy } from '@dxos/react-client/echo';
import { type PluginDefinition } from '@dxos/react-surface';

import { ThreadMain, ThreadSidebar } from './components';
import translations from './translations';
import { isThread, THREAD_PLUGIN, ThreadAction, type ThreadPluginProvides } from './types';
import { objectToGraphNode } from './util';

// TODO(wittjosiah): This ensures that typed objects are not proxied by deepsignal. Remove.
// https://github.com/luisherranz/deepsignal/issues/36
(globalThis as any)[ThreadType.name] = ThreadType;

export const ThreadPlugin = (): PluginDefinition<ThreadPluginProvides> => {
  const adapter = new GraphNodeAdapter({ filter: ThreadType.filter(), adapter: objectToGraphNode });

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
        nodes: (parent) => {
          if (!(parent.data instanceof SpaceProxy)) {
            return;
          }

          const space = parent.data;

          parent.addAction({
            id: `${THREAD_PLUGIN}/create`,
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
                action: SplitViewAction.ACTIVATE,
              },
            ],
            properties: {
              testId: 'threadPlugin.createThread',
            },
          });
          return adapter.createNodes(space, parent);
        },
      },
      component: (data, role) => {
        switch (role) {
          case 'main': {
            if (!data || typeof data !== 'object' || !isThread(data)) {
              return null;
            }
            return ThreadMain;
          }

          case 'complementary':
            return ThreadSidebar;
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

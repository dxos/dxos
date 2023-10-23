//
// Copyright 2023 DXOS.org
//

import { Plus } from '@phosphor-icons/react';
import React from 'react';

import { type IntentPluginProvides } from '@braneframe/plugin-intent';
import { GraphNodeAdapter, SpaceAction } from '@braneframe/plugin-space';
import { LayoutAction } from '@braneframe/plugin-layout';
import { Thread as ThreadType } from '@braneframe/types';
import { SpaceProxy } from '@dxos/react-client/echo';
import { findPlugin, type PluginDefinition } from '@dxos/app-framework';

import { ThreadMain, ThreadSidebar } from './components';
import translations from './translations';
import { isThread, THREAD_PLUGIN, ThreadAction, type ThreadPluginProvides } from './types';
import { objectToGraphNode } from './util';

// TODO(wittjosiah): This ensures that typed objects are not proxied by deepsignal. Remove.
// https://github.com/luisherranz/deepsignal/issues/36
(globalThis as any)[ThreadType.name] = ThreadType;

export const ThreadPlugin = (): PluginDefinition<ThreadPluginProvides> => {
  let adapter: GraphNodeAdapter<ThreadType> | undefined;

  return {
    meta: {
      id: THREAD_PLUGIN,
    },
    ready: async (plugins) => {
      const intentPlugin = findPlugin<IntentPluginProvides>(plugins, 'dxos.org/plugin/intent');
      const dispatch = intentPlugin?.provides?.intent?.dispatch;
      if (dispatch) {
        adapter = new GraphNodeAdapter({ dispatch, filter: ThreadType.filter(), adapter: objectToGraphNode });
      }
    },
    unload: async () => {
      adapter?.clear();
    },
    provides: {
      translations,
      graph: {
        withPlugins: (plugins) => (parent) => {
          if (!(parent.data instanceof SpaceProxy)) {
            return;
          }

          const space = parent.data;
          const intentPlugin = findPlugin<IntentPluginProvides>(plugins, 'dxos.org/plugin/intent');

          parent.addAction({
            id: `${THREAD_PLUGIN}/create`,
            label: ['create thread label', { ns: THREAD_PLUGIN }],
            icon: (props) => <Plus {...props} />,
            invoke: () =>
              intentPlugin?.provides.intent.dispatch([
                {
                  plugin: THREAD_PLUGIN,
                  action: ThreadAction.CREATE,
                },
                {
                  action: SpaceAction.ADD_OBJECT,
                  data: { spaceKey: parent.data.key.toHex() },
                },
                {
                  action: LayoutAction.ACTIVATE,
                },
              ]),
            properties: {
              testId: 'threadPlugin.createObject',
            },
          });

          return adapter?.createNodes(space, parent);
        },
      },
      component: (data, role) => {
        switch (role) {
          case 'main': {
            if (!isThread(data)) {
              return null;
            }

            return ThreadMain;
          }

          case 'context-thread':
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

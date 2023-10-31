//
// Copyright 2023 DXOS.org
//

import { Chat, type IconProps } from '@phosphor-icons/react';
import React from 'react';

import { SpaceAction } from '@braneframe/plugin-space';
import { Folder, Thread as ThreadType } from '@braneframe/types';
import { resolvePlugin, type PluginDefinition, parseIntentPlugin, LayoutAction } from '@dxos/app-framework';

import { ThreadMain, ThreadSidebar } from './components';
import translations from './translations';
import { THREAD_PLUGIN, ThreadAction, type ThreadPluginProvides, isThread } from './types';

// TODO(wittjosiah): This ensures that typed objects are not proxied by deepsignal. Remove.
// https://github.com/luisherranz/deepsignal/issues/36
(globalThis as any)[ThreadType.name] = ThreadType;

export const ThreadPlugin = (): PluginDefinition<ThreadPluginProvides> => {
  return {
    meta: {
      id: THREAD_PLUGIN,
    },
    provides: {
      metadata: {
        records: {
          [ThreadType.schema.typename]: {
            fallbackName: ['thread title placeholder', { ns: THREAD_PLUGIN }],
            icon: (props: IconProps) => <Chat {...props} />,
          },
        },
      },
      translations,
      graph: {
        builder: ({ parent, plugins }) => {
          if (!(parent.data instanceof Folder)) {
            return;
          }

          const intentPlugin = resolvePlugin(plugins, parseIntentPlugin);

          parent.actionsMap['create-object-group']?.addAction({
            id: `${THREAD_PLUGIN}/create`,
            label: ['create thread label', { ns: THREAD_PLUGIN }],
            icon: (props) => <Chat {...props} />,
            invoke: () =>
              intentPlugin?.provides.intent.dispatch([
                {
                  plugin: THREAD_PLUGIN,
                  action: ThreadAction.CREATE,
                },
                {
                  action: SpaceAction.ADD_TO_FOLDER,
                  data: { folder: parent.data },
                },
                {
                  action: LayoutAction.ACTIVATE,
                },
              ]),
            properties: {
              testId: 'threadPlugin.createObject',
            },
          });
        },
      },
      surface: {
        component: (data, role) => {
          switch (role) {
            case 'main': {
              return isThread(data.active) ? <ThreadMain thread={data.active} /> : null;
            }

            case 'context-thread':
              return <ThreadSidebar />;

            default:
              return null;
          }
        },
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

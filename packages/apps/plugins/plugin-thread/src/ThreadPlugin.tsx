//
// Copyright 2023 DXOS.org
//

import { List, Plus } from '@phosphor-icons/react';
import React from 'react';

import { GraphNodeAdapter, SpaceAction } from '@braneframe/plugin-space';
import { TreeViewAction } from '@braneframe/plugin-treeview';
import { Thread as ThreadType } from '@braneframe/types';
import { Button, Toolbar } from '@dxos/aurora';
import { getSize } from '@dxos/aurora-theme';
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
                action: TreeViewAction.ACTIVATE,
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
            return Test;
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

// TODO(burdon): Get current space.
const Test = (props: any) => {
  // console.log(props);
  return (
    <div>
      <Toolbar.Root>
        <div role='none' className='grow' />
        <Button variant='ghost'>
          <List weight='light' className={getSize(4)} />
        </Button>
      </Toolbar.Root>
    </div>
  );
};

//
// Copyright 2023 DXOS.org
//

import { Chat, IconProps, Plus, Trash } from '@phosphor-icons/react';
import React from 'react';

import { GraphNode } from '@braneframe/plugin-graph';
import { GraphNodeAdapter } from '@braneframe/plugin-space';
import { TreeViewProvides } from '@braneframe/plugin-treeview';
import { Thread as ThreadType } from '@braneframe/types';
import { SpaceProxy } from '@dxos/client';
import { findPlugin, PluginDefinition } from '@dxos/react-surface';

import { ThreadMain } from './components';
import { isThread, THREAD_PLUGIN, ThreadPluginProvides } from './props';
import translations from './translations';

export const ThreadPlugin = (): PluginDefinition<ThreadPluginProvides> => {
  const objectToGraphNode = (parent: GraphNode, object: ThreadType): GraphNode => ({
    id: object.id,
    index: 'a1', // TODO(burdon): Index.
    label: object.title ?? ['thread title placeholder', { ns: THREAD_PLUGIN }],
    icon: (props: IconProps) => <Chat {...props} />,
    data: object,
    parent,
    pluginActions: {
      [THREAD_PLUGIN]: [
        {
          id: 'delete', // TODO(burdon): Namespace.
          index: 'a1',
          label: ['delete thread label', { ns: THREAD_PLUGIN }],
          icon: (props: IconProps) => <Trash {...props} />,
          invoke: async () => parent.data?.db.remove(object),
        },
      ],
    },
  });

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
        actions: (parent, _, plugins) => {
          if (!(parent.data instanceof SpaceProxy)) {
            return [];
          }

          const treeViewPlugin = findPlugin<TreeViewProvides>(plugins, 'dxos:treeview');
          const space = parent.data;
          return [
            {
              id: `${THREAD_PLUGIN}/create-thread`, // TODO(burdon): Namespace?
              index: 'a1', // TODO(burdon): ???
              testId: 'threadPlugin.createThread', // TODO(burdon): Namespace?
              label: ['create thread label', { ns: THREAD_PLUGIN }],
              icon: (props) => <Plus {...props} />,
              invoke: async () => {
                const object = space.db.add(new ThreadType());
                if (treeViewPlugin) {
                  treeViewPlugin.provides.treeView.selected = [parent.id, object.id];
                }
              },
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
    },
  };
};

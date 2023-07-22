//
// Copyright 2023 DXOS.org
//

import { Article, IconProps, Plus, Trash } from '@phosphor-icons/react';
import get from 'lodash.get';
import React from 'react';

import { GraphNode } from '@braneframe/plugin-graph';
import { GraphNodeAdapter, getIndices } from '@braneframe/plugin-space';
import { TreeViewProvides } from '@braneframe/plugin-treeview';
import { Stack as StackType } from '@braneframe/types';
import { Space, SpaceProxy } from '@dxos/client';
import { findPlugin, Plugin, PluginDefinition } from '@dxos/react-surface';

import { StackMain, StackSectionOverlay } from './components';
import { stackState } from './stores';
import translations from './translations';
import { StackPluginProvides, StackProvides } from './types';
import { STACK_PLUGIN, isStack } from './util';

export const StackPlugin = (): PluginDefinition<StackPluginProvides> => {
  const objectToGraphNode = (parent: GraphNode<Space>, object: StackType, index: string): GraphNode => ({
    id: object.id,
    index: get(object, 'meta.index', index), // TODO(burdon): Data should not be on object?
    label: object.title ?? ['stack title placeholder', { ns: STACK_PLUGIN }],
    icon: (props: IconProps) => <Article {...props} />,
    data: object,
    parent,
    pluginActions: {
      [STACK_PLUGIN]: [
        {
          id: 'delete',
          index: 'a1',
          label: ['delete stack label', { ns: STACK_PLUGIN }],
          icon: (props: IconProps) => <Trash {...props} />,
          invoke: async () => {
            parent.data?.db.remove(object);
          },
        },
      ],
    },
  });

  const adapter = new GraphNodeAdapter(StackType.filter(), objectToGraphNode);

  return {
    meta: {
      id: STACK_PLUGIN,
    },
    ready: async (plugins) => {
      return plugins.forEach((plugin) => {
        if (Array.isArray((plugin as Plugin<StackProvides>).provides?.stack?.creators)) {
          stackState.creators = (plugin as Plugin<StackProvides>).provides.stack.creators;
        }
        if (Array.isArray((plugin as Plugin<StackProvides>).provides?.stack?.choosers)) {
          stackState.choosers = (plugin as Plugin<StackProvides>).provides.stack.choosers;
        }
      });
    },
    unload: async () => {
      adapter.clear();
    },
    provides: {
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
              id: 'create-stack',
              index: getIndices(1)[0],
              testId: 'stackPlugin.createStack',
              label: ['create stack label', { ns: STACK_PLUGIN }],
              icon: (props) => <Plus {...props} />,
              invoke: async () => {
                const object = space.db.add(new StackType());
                if (treeViewPlugin) {
                  treeViewPlugin.provides.treeView.selected = [parent.id, object.id];
                }
              },
            },
          ];
        },
      },
      translations,
      component: (datum, role) => {
        switch (role) {
          case 'main':
            if (Array.isArray(datum) && isStack(datum[datum.length - 1])) {
              return StackMain;
            } else {
              return null;
            }
          case 'dragoverlay':
            if (datum && typeof datum === 'object' && 'object' in datum) {
              return StackSectionOverlay;
            } else {
              return null;
            }
          default:
            return null;
        }
      },
      components: {
        StackMain,
      },
      stack: stackState,
    },
  };
};

//
// Copyright 2023 DXOS.org
//

import { Plus } from '@phosphor-icons/react';
import { getIndices } from '@tldraw/indices';
import React from 'react';

import { TreeViewProvides } from '@braneframe/plugin-treeview';
import { Stack } from '@braneframe/types';
import { UnsubscribeCallback } from '@dxos/async';
import { SpaceProxy, subscribe } from '@dxos/client';
import { findPlugin, Plugin, PluginDefinition } from '@dxos/react-surface';

import { StackMain, StackSectionOverlay } from './components';
import { stackState } from './stores';
import translations from './translations';
import { StackPluginProvides, StackProvides } from './types';
import { STACK_PLUGIN, isStack, stackToGraphNode } from './util';

export const StackPlugin = (): PluginDefinition<StackPluginProvides> => {
  const subscriptions = new Map<string, UnsubscribeCallback>();
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
      subscriptions.forEach((unsubscribe) => unsubscribe());
      subscriptions.clear();
    },
    provides: {
      graph: {
        nodes: (parent, emit) => {
          if (!(parent.data instanceof SpaceProxy)) {
            return [];
          }

          const space = parent.data;
          const query = space.db.query(Stack.filter());
          const stackIndices = getIndices(query.objects.length);
          if (!subscriptions.has(parent.id)) {
            subscriptions.set(
              parent.id,
              query.subscribe(() => emit()),
            );
          }

          query.objects.forEach((stack, index) => {
            if (!subscriptions.has(stack.id)) {
              subscriptions.set(
                stack.id,
                stack[subscribe](() => {
                  if (stack.__deleted) {
                    subscriptions.delete(stack.id);
                    return;
                  }

                  emit(stackToGraphNode(stack, parent, stackIndices[index]));
                }),
              );
            }
          });

          return query.objects.map((stack, index) => stackToGraphNode(stack, parent, stackIndices[index]));
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
                const object = space.db.add(new Stack());
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

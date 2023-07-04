//
// Copyright 2023 DXOS.org
//

import { Intersect, Planet } from '@phosphor-icons/react';
import React from 'react';

import { ClientPluginProvides } from '@braneframe/plugin-client';
import { GraphNode, GraphProvides, GraphPluginProvides, isGraphNode } from '@braneframe/plugin-graph';
import { TranslationsProvides } from '@braneframe/plugin-theme';
import { TreeViewProvides } from '@braneframe/plugin-treeview';
import { EventSubscriptions } from '@dxos/async';
import { createSubscription } from '@dxos/observable-object';
import {
  IFrameClientServicesHost,
  IFrameClientServicesProxy,
  ShellLayout,
  Space,
  SpaceProxy,
} from '@dxos/react-client';
import { PluginDefinition, findPlugin } from '@dxos/react-surface';

import { DialogRenameSpace, DialogRestoreSpace, EmptySpace, EmptyTree, SpaceMain, SpaceMainEmpty } from './components';
import translations from './translations';
import { SPACE_PLUGIN, getSpaceId, isSpace, spaceToGraphNode } from './util';

type SpacePluginProvides = GraphProvides & TranslationsProvides;
export const SpacePlugin = (): PluginDefinition<SpacePluginProvides> => {
  let onSpaceUpdate: ((node?: GraphNode<Space>) => void) | undefined;
  const subscriptions = new EventSubscriptions();
  const spaceSubs = new EventSubscriptions();

  return {
    meta: {
      id: SPACE_PLUGIN,
    },
    ready: async (plugins) => {
      const clientPlugin = findPlugin<ClientPluginProvides>(plugins, 'dxos:client');
      const treeViewPlugin = findPlugin<TreeViewProvides>(plugins, 'dxos:treeview');
      const graphPlugin = findPlugin<GraphPluginProvides>(plugins, 'dxos:graph');
      if (!clientPlugin) {
        return;
      }

      const client = clientPlugin.provides.client;
      subscriptions.add(
        client.spaces.subscribe((spaces) => {
          spaceSubs.clear();
          spaces.forEach((space) => {
            const handle = createSubscription(() => {
              onSpaceUpdate?.(spaceToGraphNode(space, plugins));
            });
            handle.update([space.properties]);
            spaceSubs.add(handle.unsubscribe);
          });
          onSpaceUpdate?.();
        }).unsubscribe,
      );

      if (!treeViewPlugin) {
        return;
      }

      const treeView = treeViewPlugin.provides.treeView;

      if (client.services instanceof IFrameClientServicesProxy || client.services instanceof IFrameClientServicesHost) {
        client.services.joinedSpace.on((spaceKey) => {
          treeView.selected = [getSpaceId(spaceKey)];
        });
      }

      const nodeHandle = createSubscription(() => {
        const space = graphPlugin?.provides.graph.pluginChildren?.[SPACE_PLUGIN]?.find(
          (node) => node.id === treeView.selected[0],
        )?.data;
        if (
          space instanceof SpaceProxy &&
          (client.services instanceof IFrameClientServicesProxy || client.services instanceof IFrameClientServicesHost)
        ) {
          client.services.setSpaceProvider(() => space.key);
        }
      });
      nodeHandle.update([treeView]);
      subscriptions.add(nodeHandle.unsubscribe);
    },
    unload: async () => {
      onSpaceUpdate = undefined;
      spaceSubs.clear();
      subscriptions.clear();
    },
    provides: {
      translations,
      component: (datum, role) => {
        switch (role) {
          case 'main':
            switch (true) {
              case isSpace(datum):
                return SpaceMainEmpty;
              default:
                return null;
            }
          case 'tree--empty':
            switch (true) {
              case datum === SPACE_PLUGIN:
                return EmptyTree;
              case isGraphNode(datum) && isSpace(datum?.data):
                return EmptySpace;
              default:
                return null;
            }
          case 'dialog':
            if (Array.isArray(datum)) {
              switch (datum[0]) {
                case 'dxos:space/RenameSpaceDialog':
                  return DialogRenameSpace;
                case 'dxos:space/RestoreSpaceDialog':
                  return DialogRestoreSpace;
                default:
                  return null;
              }
            } else {
              return null;
            }
          default:
            return null;
        }
      },
      components: {
        Main: SpaceMain,
      },
      graph: {
        nodes: (parent, emit, plugins) => {
          if (parent.id !== 'root') {
            return [];
          }

          onSpaceUpdate = emit;
          const clientPlugin = findPlugin<ClientPluginProvides>(plugins, 'dxos:client');
          return clientPlugin?.provides.client.spaces.get().map((space) => spaceToGraphNode(space, plugins)) ?? [];
        },
        actions: (parent, emit, plugins) => {
          if (parent.id !== 'root') {
            return [];
          }

          const clientPlugin = findPlugin<ClientPluginProvides>(plugins, 'dxos:client');
          if (!clientPlugin) {
            return [];
          }

          // TODO(wittjosiah): Disable if no identity.
          return [
            {
              id: 'create-space',
              testId: 'spacePlugin.createSpace',
              label: ['create space label', { ns: 'os' }],
              icon: (props) => <Planet {...props} />,
              disposition: 'toolbar',
              invoke: async () => {
                await clientPlugin.provides.client.createSpace();
              },
            },
            {
              id: 'join-space',
              testId: 'spacePlugin.joinSpace',
              label: ['join space label', { ns: 'os' }],
              icon: (props) => <Intersect {...props} />,
              disposition: 'toolbar',
              invoke: async () => {
                await clientPlugin.provides.setLayout(ShellLayout.JOIN_SPACE);
              },
            },
          ];
        },
      },
    },
  };
};

//
// Copyright 2023 DXOS.org
//

import { Devices, Intersect, Planet } from '@phosphor-icons/react';
import { effect } from '@preact/signals-core';
import { getIndices } from '@tldraw/indices';
import React from 'react';

import { ClientPluginProvides } from '@braneframe/plugin-client';
import { GraphNode, GraphProvides, GraphPluginProvides, isGraphNode } from '@braneframe/plugin-graph';
import { IntentProvides } from '@braneframe/plugin-intent';
import { SplitViewProvides } from '@braneframe/plugin-splitview';
import { TranslationsProvides } from '@braneframe/plugin-theme';
import { TreeViewPluginProvides } from '@braneframe/plugin-treeview';
import { EventSubscriptions } from '@dxos/async';
import { createSubscription } from '@dxos/echo-schema';
import { IFrameClientServicesHost, IFrameClientServicesProxy, PublicKey, ShellLayout } from '@dxos/react-client';
import { Space, SpaceProxy } from '@dxos/react-client/echo';
import { PluginDefinition, findPlugin } from '@dxos/react-surface';

import { backupSpace } from './backup';
import { DialogRenameSpace, DialogRestoreSpace, EmptySpace, EmptyTree, SpaceMain, SpaceMainEmpty } from './components';
import translations from './translations';
import { SPACE_PLUGIN, SPACE_PLUGIN_SHORT_ID, SpaceAction } from './types';
import { getSpaceId, isSpace, spaceToGraphNode } from './util';

type SpacePluginProvides = GraphProvides & IntentProvides & TranslationsProvides;
export const SpacePlugin = (): PluginDefinition<SpacePluginProvides> => {
  let onSpaceUpdate: ((node?: GraphNode<Space>) => void) | undefined;
  const subscriptions = new EventSubscriptions();
  const spaceSubs = new EventSubscriptions();

  return {
    meta: {
      id: SPACE_PLUGIN,
      shortId: SPACE_PLUGIN_SHORT_ID,
    },
    ready: async (plugins) => {
      const clientPlugin = findPlugin<ClientPluginProvides>(plugins, 'dxos.org/plugin/client');
      const treeViewPlugin = findPlugin<TreeViewPluginProvides>(plugins, 'dxos.org/plugin/treeview');
      const graphPlugin = findPlugin<GraphPluginProvides>(plugins, 'dxos.org/plugin/graph');
      if (!clientPlugin) {
        return;
      }

      const client = clientPlugin.provides.client;
      subscriptions.add(
        client.spaces.subscribe((spaces) => {
          spaceSubs.clear();
          const spaceIndices = getIndices(spaces.length);
          spaces.forEach((space, index) => {
            const handle = createSubscription(() => {
              onSpaceUpdate?.(spaceToGraphNode(space, plugins, spaceIndices[index]));
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
          treeView.active = [getSpaceId(spaceKey)];
        });
      }

      const dispose = effect(() => {
        const space = graphPlugin?.provides.graph.pluginChildren?.[SPACE_PLUGIN]?.find(
          (node) => node.id === treeView.active[0],
        )?.data;
        if (
          space instanceof SpaceProxy &&
          (client.services instanceof IFrameClientServicesProxy || client.services instanceof IFrameClientServicesHost)
        ) {
          client.services.setSpaceProvider(() => space.key);
        }
      });
      subscriptions.add(dispose);
    },
    unload: async () => {
      onSpaceUpdate = undefined;
      spaceSubs.clear();
      subscriptions.clear();
    },
    provides: {
      translations,
      component: (data, role) => {
        switch (role) {
          case 'main':
            switch (true) {
              case isSpace(data):
                return SpaceMainEmpty;
              default:
                return null;
            }
          case 'tree--empty':
            switch (true) {
              case data === SPACE_PLUGIN:
                return EmptyTree;
              case isGraphNode(data) && isSpace(data?.data):
                return EmptySpace;
              default:
                return null;
            }
          case 'dialog':
            if (Array.isArray(data)) {
              switch (data[0]) {
                case 'dxos.org/plugin/space/RenameSpaceDialog':
                  return DialogRenameSpace;
                case 'dxos.org/plugin/space/RestoreSpaceDialog':
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
          const clientPlugin = findPlugin<ClientPluginProvides>(plugins, 'dxos.org/plugin/client');
          const spaces = clientPlugin?.provides.client.spaces.get();
          const indices = spaces?.length ? getIndices(spaces.length) : [];
          return spaces?.map((space, index) => spaceToGraphNode(space, plugins, indices[index])) ?? [];
        },
        actions: (parent) => {
          if (parent.id !== 'root') {
            return [];
          }

          const indices = getIndices(3);

          // TODO(wittjosiah): Disable if no identity.
          return [
            {
              id: 'create-space',
              index: indices[0],
              testId: 'spacePlugin.createSpace',
              label: ['create space label', { ns: 'os' }],
              icon: (props) => <Planet {...props} />,
              disposition: 'toolbar',
              intent: {
                plugin: SPACE_PLUGIN,
                action: SpaceAction.CREATE,
              },
            },
            {
              id: 'join-space',
              index: indices[1],
              testId: 'spacePlugin.joinSpace',
              label: ['join space label', { ns: 'os' }],
              icon: (props) => <Intersect {...props} />,
              disposition: 'toolbar',
              intent: {
                plugin: SPACE_PLUGIN,
                action: SpaceAction.JOIN,
              },
            },
            // TODO(wittjosiah): Factor out.
            {
              id: 'invite-device',
              index: indices[2],
              testId: 'spacePlugin.inviteDevice',
              label: ['invite device label', { ns: 'os' }],
              icon: (props) => <Devices {...props} />,
              intent: {
                action: 'device-invitations',
              },
            },
          ];
        },
      },
      intent: {
        resolver: async (intent, plugins) => {
          const clientPlugin = findPlugin<ClientPluginProvides>(plugins, 'dxos.org/plugin/client');
          switch (intent.action) {
            case SpaceAction.CREATE: {
              return clientPlugin?.provides.client.createSpace(intent.data);
            }

            case SpaceAction.JOIN: {
              if (clientPlugin) {
                await clientPlugin.provides.setLayout(ShellLayout.JOIN_SPACE);
                return true;
              }
              return;
            }

            case 'device-invitations': {
              if (clientPlugin) {
                await clientPlugin.provides.setLayout(ShellLayout.DEVICE_INVITATIONS);
                return true;
              }
              return;
            }
          }

          const spaceKey = PublicKey.safeFrom(intent.data.spaceKey);
          if (!spaceKey) {
            return;
          }

          const space = clientPlugin?.provides.client.getSpace(spaceKey);
          switch (intent.action) {
            case SpaceAction.SHARE: {
              if (clientPlugin) {
                await clientPlugin.provides.setLayout(ShellLayout.SPACE_INVITATIONS, { spaceKey });
                return true;
              }
              break;
            }

            case SpaceAction.RENAME: {
              const splitViewPlugin = findPlugin<SplitViewProvides>(plugins, 'dxos.org/plugin/splitview');
              if (space && splitViewPlugin?.provides.splitView) {
                splitViewPlugin.provides.splitView.dialogOpen = true;
                splitViewPlugin.provides.splitView.dialogContent = ['dxos.org/plugin/space/RenameSpaceDialog', space];
                return true;
              }
              break;
            }

            case SpaceAction.HIDE: {
              const treeViewPlugin = findPlugin<TreeViewPluginProvides>(plugins, 'dxos.org/plugin/treeview');
              const client = clientPlugin?.provides.client;
              const identity = client?.halo.identity.get();
              if (identity && space) {
                const identityHex = identity.identityKey.toHex();
                space.properties.members = {
                  ...space.properties.members,
                  [identityHex]: {
                    ...space.properties.members?.[identityHex],
                    hidden: true,
                  },
                };
                if (treeViewPlugin?.provides.treeView.active[0] === getSpaceId(space.key)) {
                  treeViewPlugin.provides.treeView.active = [];
                }
                return true;
              }
              break;
            }

            case SpaceAction.BACKUP: {
              if (space) {
                // TODO(wittjosiah): Expose translations helper from theme plugin provides.
                const backupBlob = await backupSpace(space, 'untitled document');
                const spaceName = space.properties.name || 'untitled space';
                const url = URL.createObjectURL(backupBlob);
                const element = document.createElement('a');
                element.setAttribute('href', url);
                element.setAttribute('download', `${spaceName} backup.zip`);
                element.setAttribute('target', 'download');
                element.click();
                return true;
              }
              break;
            }

            case SpaceAction.RESTORE: {
              const splitViewPlugin = findPlugin<SplitViewProvides>(plugins, 'dxos.org/plugin/splitview');
              if (space && splitViewPlugin?.provides.splitView) {
                splitViewPlugin.provides.splitView.dialogOpen = true;
                splitViewPlugin.provides.splitView.dialogContent = ['dxos.org/plugin/space/RestoreSpaceDialog', space];
                return true;
              }
              break;
            }

            case SpaceAction.ADD_OBJECT: {
              if (space && intent.data.object) {
                const object = space.db.add(intent.data.object);
                return [getSpaceId(space.key), object.id];
              }
              break;
            }

            case SpaceAction.REMOVE_OBJECT: {
              const object =
                typeof intent.data.objectId === 'string' ? space?.db.getObjectById(intent.data.objectId) : null;
              if (space && object) {
                space.db.remove(object);
                return true;
              }
              break;
            }
          }
        },
      },
    },
  };
};

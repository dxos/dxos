//
// Copyright 2023 DXOS.org
//

import { Devices, Intersect, Planet } from '@phosphor-icons/react';
import { effect } from '@preact/signals-react';
import { getIndices } from '@tldraw/indices';
import { deepSignal } from 'deepsignal/react';
import React from 'react';

import { ClientPluginProvides } from '@braneframe/plugin-client';
import { GraphPluginProvides, isGraphNode } from '@braneframe/plugin-graph';
import { SplitViewProvides } from '@braneframe/plugin-splitview';
import { TreeViewPluginProvides } from '@braneframe/plugin-treeview';
import { EventSubscriptions } from '@dxos/async';
import { createSubscription } from '@dxos/echo-schema';
import { IFrameClientServicesHost, IFrameClientServicesProxy, PublicKey, ShellLayout } from '@dxos/react-client';
import { Space, SpaceProxy } from '@dxos/react-client/echo';
import { PluginDefinition, findPlugin } from '@dxos/react-surface';

import { backupSpace } from './backup';
import {
  DialogRenameSpace,
  DialogRestoreSpace,
  EmptySpace,
  EmptyTree,
  SpaceMain,
  SpaceMainEmpty,
  SpacePresence,
} from './components';
import translations from './translations';
import { SPACE_PLUGIN, SPACE_PLUGIN_SHORT_ID, SpaceAction, SpacePluginProvides, SpaceState } from './types';
import { getSpaceId, isSpace, spaceToGraphNode } from './util';

// TODO(wittjosiah): This ensures that typed objects are not proxied by deepsignal. Remove.
// https://github.com/luisherranz/deepsignal/issues/36
(globalThis as any)[SpaceProxy.name] = SpaceProxy;

export const SpacePlugin = (): PluginDefinition<SpacePluginProvides> => {
  const state = deepSignal<SpaceState>({ current: undefined });
  const subscriptions = new EventSubscriptions();
  let disposeSetSpaceProvider: () => void;

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

      if (!treeViewPlugin) {
        return;
      }

      const treeView = treeViewPlugin.provides.treeView;

      if (client.services instanceof IFrameClientServicesProxy || client.services instanceof IFrameClientServicesHost) {
        client.services.joinedSpace.on((spaceKey) => {
          treeView.active = getSpaceId(spaceKey);
        });
      }

      disposeSetSpaceProvider = effect(async () => {
        if (!treeView.activeNode) {
          return;
        }

        const space = await new Promise<Space | undefined>((resolve) => {
          graphPlugin?.provides.graph.traverse({
            from: treeView.activeNode,
            direction: 'up',
            onVisitNode: (node) => {
              if (isSpace(node.data)) {
                resolve(node.data);
              }
            },
          });
          resolve(undefined);
        });

        state.current = space;

        if (
          space instanceof SpaceProxy &&
          (client.services instanceof IFrameClientServicesProxy || client.services instanceof IFrameClientServicesHost)
        ) {
          client.services.setSpaceProvider(() => space.key);
        }
      });
    },
    unload: async () => {
      subscriptions.clear();
      disposeSetSpaceProvider?.();
    },
    provides: {
      space: state as SpaceState,
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
          case 'presence':
            return SpacePresence;
          default:
            return null;
        }
      },
      components: {
        Main: SpaceMain,
      },
      graph: {
        withPlugins: (plugins) => (parent) => {
          if (parent.id !== 'root') {
            return;
          }

          const clientPlugin = findPlugin<ClientPluginProvides>(plugins, 'dxos.org/plugin/client');
          if (!clientPlugin) {
            return;
          }

          const [groupNode] = parent.add({
            id: getSpaceId('all-spaces'),
            label: ['plugin name', { ns: SPACE_PLUGIN }],
            properties: { palette: 'blue' },
          });

          const client = clientPlugin.provides.client;
          const spaces = client.spaces.get();
          const indices = spaces?.length ? getIndices(spaces.length) : [];
          spaces.forEach((space, index) => spaceToGraphNode(space, groupNode, indices[index]));

          const { unsubscribe } = client.spaces.subscribe((spaces) => {
            subscriptions.clear();
            const indices = getIndices(spaces.length);
            spaces.forEach((space, index) => {
              const handle = createSubscription(() => {
                spaceToGraphNode(space, groupNode, indices[index]);
              });
              handle.update([space.properties]);
              subscriptions.add(handle.unsubscribe);

              spaceToGraphNode(space, groupNode, indices[index]);
            });
          });

          groupNode.addAction(
            {
              id: 'create-space',
              label: ['create space label', { ns: 'os' }],
              icon: (props) => <Planet {...props} />,
              properties: {
                disposition: 'toolbar',
                testId: 'spacePlugin.createSpace',
              },
              intent: {
                plugin: SPACE_PLUGIN,
                action: SpaceAction.CREATE,
              },
            },
            {
              id: 'join-space',
              label: ['join space label', { ns: 'os' }],
              icon: (props) => <Intersect {...props} />,
              properties: {
                disposition: 'toolbar',
                testId: 'spacePlugin.joinSpace',
              },
              intent: {
                plugin: SPACE_PLUGIN,
                action: SpaceAction.JOIN,
              },
            },
            // TODO(wittjosiah): Factor out.
            {
              id: 'invite-device',
              label: ['invite device label', { ns: 'os' }],
              icon: (props) => <Devices {...props} />,
              properties: {
                testId: 'spacePlugin.inviteDevice',
              },
              intent: {
                action: 'device-invitations',
              },
            },
          );

          return () => {
            unsubscribe();
            subscriptions.clear();
          };
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
                clientPlugin.provides.setLayout(ShellLayout.JOIN_SPACE);
                return true;
              }
              return;
            }

            case 'device-invitations': {
              if (clientPlugin) {
                clientPlugin.provides.setLayout(ShellLayout.DEVICE_INVITATIONS);
                return true;
              }
              return;
            }
          }

          const spaceKey = intent.data?.spaceKey && PublicKey.safeFrom(intent.data.spaceKey);
          if (!spaceKey) {
            return;
          }

          const space = clientPlugin?.provides.client.getSpace(spaceKey);
          switch (intent.action) {
            case SpaceAction.SHARE: {
              if (clientPlugin) {
                clientPlugin.provides.setLayout(ShellLayout.SPACE_INVITATIONS, { spaceKey });
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

            case SpaceAction.CLOSE: {
              void space?.internal.close();
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
                return object;
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

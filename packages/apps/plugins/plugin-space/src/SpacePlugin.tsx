//
// Copyright 2023 DXOS.org
//

import { Intersect, Planet } from '@phosphor-icons/react';
import { effect } from '@preact/signals-react';
import { getIndices } from '@tldraw/indices';
import { RevertDeepSignal, deepSignal } from 'deepsignal/react';
import React from 'react';

import { CLIENT_PLUGIN, ClientPluginProvides } from '@braneframe/plugin-client';
import { Graph, GraphPluginProvides, isGraphNode } from '@braneframe/plugin-graph';
import { IntentPluginProvides } from '@braneframe/plugin-intent';
import { SplitViewProvides } from '@braneframe/plugin-splitview';
import {
  TREE_VIEW_PLUGIN,
  TreeViewAction,
  TreeViewPluginProvides,
  setAppStateIndex,
} from '@braneframe/plugin-treeview';
import { AppState } from '@braneframe/types';
import { EventSubscriptions } from '@dxos/async';
import { subscribe } from '@dxos/echo-schema';
import { LocalStorageStore } from '@dxos/local-storage';
import { PublicKey } from '@dxos/react-client';
import { Space, SpaceProxy } from '@dxos/react-client/echo';
import { PluginDefinition, findPlugin } from '@dxos/react-surface';

import { backupSpace } from './backup';
import {
  DialogRestoreSpace,
  EmptySpace,
  EmptyTree,
  SpaceMain,
  SpaceMainEmpty,
  SpacePresence,
  PopoverRenameObject,
  PopoverRenameSpace,
} from './components';
import SpaceSettings from './components/SpaceSettings';
import translations from './translations';
import {
  SPACE_PLUGIN,
  SPACE_PLUGIN_SHORT_ID,
  SpaceAction,
  SpacePluginProvides,
  SpaceSettingsProps,
  SpaceState,
} from './types';
import { getSpaceId, isSpace, spaceToGraphNode } from './util';

// TODO(wittjosiah): This ensures that typed objects are not proxied by deepsignal. Remove.
// https://github.com/luisherranz/deepsignal/issues/36
(globalThis as any)[SpaceProxy.name] = SpaceProxy;
(globalThis as any)[PublicKey.name] = PublicKey;

export const SpacePlugin = (): PluginDefinition<SpacePluginProvides> => {
  const settings = new LocalStorageStore<SpaceSettingsProps>('braneframe.plugin-space');
  const state = deepSignal<SpaceState>({ active: undefined, viewers: [] });
  const graphSubscriptions = new EventSubscriptions();
  const spaceSubscriptions = new EventSubscriptions();
  const subscriptions = new EventSubscriptions();
  let handleKeyDown: (event: KeyboardEvent) => void;

  return {
    meta: {
      id: SPACE_PLUGIN,
      shortId: SPACE_PLUGIN_SHORT_ID,
    },
    ready: async (plugins) => {
      settings.prop(settings.values.$showHidden!, 'showHidden', LocalStorageStore.bool);
      const intentPlugin = findPlugin<IntentPluginProvides>(plugins, 'dxos.org/plugin/intent');
      const graphPlugin = findPlugin<GraphPluginProvides>(plugins, 'dxos.org/plugin/graph');
      const clientPlugin = findPlugin<ClientPluginProvides>(plugins, CLIENT_PLUGIN);
      const treeViewPlugin = findPlugin<TreeViewPluginProvides>(plugins, TREE_VIEW_PLUGIN);
      if (!clientPlugin || !treeViewPlugin) {
        return;
      }

      const client = clientPlugin.provides.client;
      const treeView = treeViewPlugin.provides.treeView;

      // Check if opening app from invitation code.
      const searchParams = new URLSearchParams(location.search);
      const spaceInvitationCode = searchParams.get('spaceInvitationCode');
      if (spaceInvitationCode) {
        void client.shell.joinSpace({ invitationCode: spaceInvitationCode }).then(async ({ space }) => {
          if (!space) {
            return;
          }

          const url = new URL(location.href);
          const params = Array.from(url.searchParams.entries());
          const [name] = params.find(([name, value]) => value === spaceInvitationCode) ?? [null, null];
          if (name) {
            url.searchParams.delete(name);
            history.replaceState({}, document.title, url.href);
          }

          await intentPlugin?.provides.intent.sendIntent({
            action: TreeViewAction.ACTIVATE,
            data: { id: getSpaceId(space.key) },
          });
        });
      }

      subscriptions.add(
        effect(async () => {
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

          state.active = space;
        }),
      );

      // TODO(burdon): Comment.
      subscriptions.add(
        effect(() => {
          const send = () => {
            const identity = client.halo.identity.get();
            const space = state.active;
            if (identity && space && treeView.active) {
              void space.postMessage('viewing', {
                identityKey: identity.identityKey.toHex(),
                spaceKey: space.key.toHex(),
                added: [treeView.active],
                removed: [treeView.previous],
              });
            }
          };

          setInterval(() => send(), 5_000);
          send();
        }),
      );

      // TODO(burdon): Comment.
      subscriptions.add(
        client.spaces.subscribe((spaces) => {
          spaceSubscriptions.clear();
          spaces.forEach((space) => {
            spaceSubscriptions.add(
              space.listen('viewing', (message) => {
                const { added, removed } = message.payload;
                const identityKey = PublicKey.safeFrom(message.payload.identityKey);
                const spaceKey = PublicKey.safeFrom(message.payload.spaceKey);
                if (identityKey && spaceKey && Array.isArray(added) && Array.isArray(removed)) {
                  state.viewers = [
                    ...state.viewers.filter(
                      (viewer) =>
                        viewer.identityKey.equals(identityKey) &&
                        viewer.spaceKey.equals(spaceKey) &&
                        !removed.some((objectId) => objectId === viewer.objectId) &&
                        !added.some((objectId) => objectId === viewer.objectId),
                    ),
                    ...added.map((objectId) => ({
                      identityKey,
                      spaceKey,
                      objectId,
                      lastSeen: Date.now(),
                    })),
                  ];
                }
              }),
            );
          });
        }).unsubscribe,
      );

      // TODO(burdon): Comment.
      handleKeyDown = (event) => {
        const modifier = event.ctrlKey || event.metaKey;
        if (event.key === '>' && event.shiftKey && modifier) {
          void client.shell.open();
        } else if (event.key === '.' && modifier) {
          const spaceKey = state.active?.key as PublicKey;
          console.log({ spaceKey: spaceKey?.truncate() });
          if (spaceKey) {
            void client.shell.shareSpace({ spaceKey });
          }
        }
      };
      window.addEventListener('keydown', handleKeyDown);
    },
    unload: async () => {
      settings.close();
      graphSubscriptions.clear();
      spaceSubscriptions.clear();
      subscriptions.clear();
      window.removeEventListener('keydown', handleKeyDown);
    },
    provides: {
      space: state as RevertDeepSignal<SpaceState>,
      settings: settings.values,
      translations,
      component: (data, role) => {
        if (data === 'dxos.org/plugin/splitview/ProfileSettings') {
          return SpaceSettings;
        }

        switch (role) {
          case 'main':
            switch (true) {
              case isSpace(data):
                return SpaceMainEmpty;
              default:
                return null;
            }
          // TODO(burdon): Add role name syntax to minimal plugin docs.
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
                case 'dxos.org/plugin/space/RestoreSpaceDialog':
                  return DialogRestoreSpace;
                default:
                  return null;
              }
            } else {
              return null;
            }
          case 'popover':
            if (Array.isArray(data)) {
              switch (data[0]) {
                case 'dxos.org/plugin/space/RenameSpacePopover':
                  return PopoverRenameSpace;
                case 'dxos.org/plugin/space/RenameObjectPopover':
                  return PopoverRenameObject;
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

          const treeViewPlugin = findPlugin<TreeViewPluginProvides>(plugins, 'dxos.org/plugin/treeview');
          const clientPlugin = findPlugin<ClientPluginProvides>(plugins, 'dxos.org/plugin/client');
          if (!clientPlugin) {
            return;
          }

          const client = clientPlugin.provides.client;
          if (!client.spaces.isReady.get()) {
            return;
          }

          // Ensure default space is always first.
          spaceToGraphNode({ space: client.spaces.default, parent, settings: settings.values });

          // Shared spaces section.
          const [groupNode] = parent.add({
            id: getSpaceId('all-spaces'),
            label: ['shared spaces label', { ns: SPACE_PLUGIN }],
            properties: {
              // TODO(burdon): Factor out palette constants.
              palette: 'pink',
              'data-testid': 'spacePlugin.allSpaces',
              acceptPersistenceClass: new Set(['appState']),
              childrenPersistenceClass: 'appState',
              onRearrangeChild: (child: Graph.Node<Space>, nextIndex: string) => {
                child.properties.index = setAppStateIndex(
                  child.id,
                  nextIndex,
                  treeViewPlugin?.provides.treeView?.appState as AppState | undefined,
                );
              },
            },
          });

          const updateSpace = (space: Space, indices: string[], index: number) => {
            const appState = treeViewPlugin?.provides.treeView?.appState;
            client.spaces.default.key.equals(space.key)
              ? spaceToGraphNode({ space, parent, settings: settings.values, appState })
              : spaceToGraphNode({
                  space,
                  parent: groupNode,
                  settings: settings.values,
                  appState,
                  defaultIndex: indices[index],
                });
          };

          const { unsubscribe } = client.spaces.subscribe((spaces) => {
            graphSubscriptions.clear();
            const indices = getIndices(spaces.length);
            spaces.forEach((space, index) => {
              graphSubscriptions.add(space.properties[subscribe](() => updateSpace(space, indices, index)));
              updateSpace(space, indices, index);
            });
          });

          const unsubscribeHidden = settings.values.$showHidden!.subscribe(() => {
            const spaces = client.spaces.get();
            const indices = getIndices(spaces.length);
            spaces.forEach((space, index) => updateSpace(space, indices, index));
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
              intent: [
                {
                  plugin: SPACE_PLUGIN,
                  action: SpaceAction.JOIN,
                },
                {
                  action: TreeViewAction.ACTIVATE,
                },
              ],
            },
          );

          return () => {
            unsubscribe();
            unsubscribeHidden();
            graphSubscriptions.clear();
          };
        },
      },
      intent: {
        resolver: async (intent, plugins) => {
          const clientPlugin = findPlugin<ClientPluginProvides>(plugins, 'dxos.org/plugin/client');
          switch (intent.action) {
            case SpaceAction.CREATE: {
              if (!clientPlugin) {
                return;
              }
              const space = await clientPlugin.provides.client.spaces.create(intent.data);
              return { space, id: getSpaceId(space.key) };
            }

            case SpaceAction.JOIN: {
              if (!clientPlugin) {
                return;
              }
              const { space } = await clientPlugin.provides.client.shell.joinSpace();
              return space && { space, id: getSpaceId(space.key) };
            }
          }

          // TODO(thure): Why is `PublicKey.safeFrom` returning `undefined` sometimes?
          const spaceKey = intent.data?.spaceKey && PublicKey.from(intent.data.spaceKey);
          if (!spaceKey) {
            return;
          }

          const space = clientPlugin?.provides.client.spaces.get(spaceKey);
          switch (intent.action) {
            case SpaceAction.SHARE: {
              if (clientPlugin) {
                const { members } = await clientPlugin.provides.client.shell.shareSpace({ spaceKey });
                return members && { members };
              }
              break;
            }

            case SpaceAction.RENAME: {
              const splitViewPlugin = findPlugin<SplitViewProvides>(plugins, 'dxos.org/plugin/splitview');
              if (space && splitViewPlugin?.provides.splitView) {
                splitViewPlugin.provides.splitView.popoverOpen = true;
                splitViewPlugin.provides.splitView.popoverContent = ['dxos.org/plugin/space/RenameSpacePopover', space];
                splitViewPlugin.provides.splitView.popoverAnchorId = `dxos.org/plugin/treeview/NavTreeItem/${getSpaceId(
                  spaceKey,
                )}`;
                return true;
              }
              break;
            }

            case SpaceAction.OPEN: {
              void space?.internal.open();
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
                // TODO(burdon): See DebugMain useFileDownload
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
                return space.db.add(intent.data.object);
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

            case SpaceAction.RENAME_OBJECT: {
              const splitViewPlugin = findPlugin<SplitViewProvides>(plugins, 'dxos.org/plugin/splitview');
              const object =
                typeof intent.data.objectId === 'string' ? space?.db.getObjectById(intent.data.objectId) : null;
              if (object && splitViewPlugin?.provides.splitView) {
                splitViewPlugin.provides.splitView.popoverOpen = true;
                splitViewPlugin.provides.splitView.popoverContent = [
                  'dxos.org/plugin/space/RenameObjectPopover',
                  object,
                ];
                splitViewPlugin.provides.splitView.popoverAnchorId = `dxos.org/plugin/treeview/NavTreeItem/${intent.data.objectId}`;
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

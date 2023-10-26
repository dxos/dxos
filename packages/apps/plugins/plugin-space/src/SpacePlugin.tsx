//
// Copyright 2023 DXOS.org
//

import { Intersect, Plus } from '@phosphor-icons/react';
import { effect } from '@preact/signals-react';
import { type RevertDeepSignal, deepSignal } from 'deepsignal/react';
import React from 'react';

import { parseClientPlugin } from '@braneframe/plugin-client';
import { isGraphNode } from '@braneframe/plugin-graph';
import { type LayoutState } from '@braneframe/plugin-layout';
import { ObjectOrder } from '@braneframe/types';
import {
  type PluginDefinition,
  resolvePlugin,
  parseIntentPlugin,
  parseGraphPlugin,
  parseLayoutPlugin,
  LayoutAction,
} from '@dxos/app-framework';
import { EventSubscriptions, type UnsubscribeCallback } from '@dxos/async';
import { isTypedObject, subscribe } from '@dxos/echo-schema';
import { LocalStorageStore } from '@dxos/local-storage';
import { PublicKey } from '@dxos/react-client';
import { type Space, SpaceProxy } from '@dxos/react-client/echo';
import { inferRecordOrder } from '@dxos/util';

import { backupSpace } from './backup';
import {
  DialogRestoreSpace,
  EmptySpace,
  EmptyTree,
  SpaceMain,
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
  type SpacePluginProvides,
  type SpaceSettingsProps,
  type SpaceState,
} from './types';
import { createNodeId, isSpace, spaceToGraphNode } from './util';

// TODO(wittjosiah): This ensures that typed objects are not proxied by deepsignal. Remove.
// https://github.com/luisherranz/deepsignal/issues/36
(globalThis as any)[SpaceProxy.name] = SpaceProxy;
(globalThis as any)[PublicKey.name] = PublicKey;

export const SpacePlugin = (): PluginDefinition<SpacePluginProvides> => {
  const settings = new LocalStorageStore<SpaceSettingsProps>(SPACE_PLUGIN);
  // TODO(wittjosiah): Plugin exposed state should be marked as read-only.
  const state = deepSignal<SpaceState>({
    active: undefined,
    viewers: [],
  }) as RevertDeepSignal<SpaceState>;
  const graphSubscriptions = new EventSubscriptions();
  const spaceSubscriptions = new EventSubscriptions();
  const subscriptions = new EventSubscriptions();
  const orderSubscriptions: Record<string, UnsubscribeCallback> = {};
  let handleKeyDown: (event: KeyboardEvent) => void;

  return {
    meta: {
      id: SPACE_PLUGIN,
      shortId: SPACE_PLUGIN_SHORT_ID,
    },
    ready: async (plugins) => {
      settings.prop(settings.values.$showHidden!, 'show-hidden', LocalStorageStore.bool);
      const intentPlugin = resolvePlugin(plugins, parseIntentPlugin);
      const graphPlugin = resolvePlugin(plugins, parseGraphPlugin);
      const clientPlugin = resolvePlugin(plugins, parseClientPlugin);
      const layoutPlugin = resolvePlugin(plugins, parseLayoutPlugin);
      if (!clientPlugin || !layoutPlugin) {
        return;
      }

      const client = clientPlugin.provides.client;
      // TODO(wittjosiah): Remove once space can be computed directly from an object.
      const layout = layoutPlugin.provides.layout as LayoutState;

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

          await intentPlugin?.provides.intent.dispatch({
            action: LayoutAction.ACTIVATE,
            data: { id: createNodeId(space.key) },
          });
        });
      }

      // Calculate the active space based on the graph and active node.
      subscriptions.add(
        effect(async () => {
          if (!layout.activeNode) {
            return;
          }

          state.active = await new Promise<Space | undefined>((resolve) => {
            graphPlugin?.provides.graph.traverse({
              node: layout.activeNode,
              direction: 'up',
              visitor: (node) => {
                if (isSpace(node.data)) {
                  resolve(node.data);
                }
              },
            });

            resolve(undefined);
          });
        }),
      );

      // Broadcast active node to other peers in the space.
      subscriptions.add(
        effect(() => {
          const send = () => {
            const identity = client.halo.identity.get();
            const space = state.active;
            if (identity && space && layout.active) {
              void space.postMessage('viewing', {
                identityKey: identity.identityKey.toHex(),
                spaceKey: space.key.toHex(),
                added: [layout.active],
                removed: [layout.previous],
              });
            }
          };

          setInterval(() => send(), 5_000);
          send();
        }),
      );

      // Listen for active nodes from other peers in the space.
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
                        !viewer.identityKey.equals(identityKey) ||
                        !viewer.spaceKey.equals(spaceKey) ||
                        (viewer.identityKey.equals(identityKey) &&
                          viewer.spaceKey.equals(spaceKey) &&
                          !removed.some((objectId) => objectId === viewer.objectId) &&
                          !added.some((objectId) => objectId === viewer.objectId)),
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

      // Keyboard shortcuts for opening shell.
      //   `Ctrl+.`: Share active space
      //   `Ctrl+Shift+.`: Open identity dialog
      handleKeyDown = (event) => {
        const modifier = event.ctrlKey || event.metaKey;
        if (event.key === '>' && event.shiftKey && modifier) {
          void client.shell.open();
        } else if (event.key === '.' && modifier) {
          const spaceKey = state.active?.key as PublicKey;
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
      space: state,
      settings: settings.values,
      translations,
      surface: {
        component: (data, role) => {
          switch (role) {
            case 'main':
              return isSpace(data.active) ? <SpaceMain space={data.active} /> : null;
            // TODO(burdon): Add role name syntax to minimal plugin docs.
            case 'tree--empty':
              switch (true) {
                case data.plugin === SPACE_PLUGIN:
                  return <EmptyTree />;
                case isGraphNode(data.activeNode) && isSpace(data.activeNode.data):
                  return <EmptySpace />;
                default:
                  return null;
              }
            case 'dialog':
              if (data.component === 'dxos.org/plugin/space/RestoreSpaceDialog' && isSpace(data.subject)) {
                return <DialogRestoreSpace space={data.subject} />;
              } else {
                return null;
              }
            case 'popover':
              if (data.component === 'dxos.org/plugin/space/RenameSpacePopover' && isSpace(data.subject)) {
                return <PopoverRenameSpace space={data.subject} />;
              } else if (
                data.component === 'dxos.org/plugin/space/RenameObjectPopover' &&
                isTypedObject(data.subject)
              ) {
                return <PopoverRenameObject object={data.subject} />;
              } else {
                return null;
              }
            case 'presence':
              return <SpacePresence />;
            case 'settings':
              return data.component === 'dxos.org/plugin/layout/ProfileSettings' ? <SpaceSettings /> : null;
            default:
              return null;
          }
        },
      },
      graph: {
        builder: ({ parent, plugins }) => {
          if (parent.id !== 'root') {
            return;
          }

          const intentPlugin = resolvePlugin(plugins, parseIntentPlugin);
          const dispatch = intentPlugin?.provides.intent.dispatch;
          const clientPlugin = resolvePlugin(plugins, parseClientPlugin);
          const client = clientPlugin?.provides.client;

          if (!dispatch || !client || !client.spaces.isReady.get()) {
            return;
          }

          // Ensure default space is always first.
          spaceToGraphNode({ space: client.spaces.default, parent, dispatch, settings: settings.values });

          // Shared spaces section.
          const allSpacesId = createNodeId('all-spaces');

          const spacesOrderQuery = client.spaces.default.db.query(ObjectOrder.filter({ scope: allSpacesId }));

          let spacesOrder: ObjectOrder | undefined;

          const [groupNode] = parent.addNode(SPACE_PLUGIN, {
            id: allSpacesId,
            label: ['shared spaces label', { ns: SPACE_PLUGIN }],
            properties: {
              // TODO(burdon): Factor out palette constants.
              palette: 'pink',
              'data-testid': 'spacePlugin.allSpaces',
              acceptPersistenceClass: new Set(['appState']),
              childrenPersistenceClass: 'appState',
              onRearrangeChildren: (nextOrder: string[]) => {
                if (!spacesOrder) {
                  const nextObjectOrder = new ObjectOrder({
                    scope: allSpacesId,
                    order: nextOrder,
                  });
                  client.spaces.default.db.add(nextObjectOrder);
                  spacesOrder = nextObjectOrder;
                } else {
                  spacesOrder.order = nextOrder;
                }
                updateSpacesOrder({ objects: [spacesOrder] });
              },
            },
          });

          const updateSpace = (space: Space) => {
            const {
              node: { id },
              subscription,
            } = client.spaces.default.key.equals(space.key)
              ? spaceToGraphNode({ space, parent, dispatch, settings: settings.values })
              : spaceToGraphNode({
                  space,
                  parent: groupNode,
                  dispatch,
                  settings: settings.values,
                });
            orderSubscriptions[id]?.();
            orderSubscriptions[id] = subscription;
          };

          const { unsubscribe } = client.spaces.subscribe((spaces) => {
            graphSubscriptions.clear();
            spaces.forEach((space, index) => {
              graphSubscriptions.add(space.properties[subscribe](() => updateSpace(space)));
              updateSpace(space);
            });
          });

          const unsubscribeHidden = settings.values.$showHidden!.subscribe(() => {
            const spaces = client.spaces.get();
            spaces.forEach((space) => updateSpace(space));
          });

          groupNode.addAction(
            {
              id: 'create-space',
              label: ['create space label', { ns: 'os' }],
              icon: (props) => <Plus {...props} />,
              properties: {
                disposition: 'toolbar',
                testId: 'spacePlugin.createSpace',
              },
              invoke: () =>
                intentPlugin?.provides.intent.dispatch({
                  plugin: SPACE_PLUGIN,
                  action: SpaceAction.CREATE,
                }),
            },
            {
              id: 'join-space',
              label: ['join space label', { ns: 'os' }],
              icon: (props) => <Intersect {...props} />,
              properties: {
                testId: 'spacePlugin.joinSpace',
              },
              invoke: () =>
                intentPlugin?.provides.intent.dispatch([
                  {
                    plugin: SPACE_PLUGIN,
                    action: SpaceAction.JOIN,
                  },
                  {
                    action: LayoutAction.ACTIVATE,
                  },
                ]),
            },
          );

          const updateSpacesOrder = ({ objects: spacesOrders }: { objects: ObjectOrder[] }) => {
            spacesOrder = spacesOrders[0];
            groupNode.childrenMap = inferRecordOrder(groupNode.childrenMap, spacesOrder?.order);
          };

          updateSpacesOrder(spacesOrderQuery);

          orderSubscriptions[allSpacesId] = spacesOrderQuery.subscribe(updateSpacesOrder);

          return () => {
            unsubscribe();
            Object.values(orderSubscriptions).forEach((cb) => cb());
            unsubscribeHidden();
            graphSubscriptions.clear();
          };
        },
      },
      intent: {
        resolver: async (intent, plugins) => {
          const clientPlugin = resolvePlugin(plugins, parseClientPlugin);
          switch (intent.action) {
            case SpaceAction.CREATE: {
              if (!clientPlugin) {
                return;
              }
              const space = await clientPlugin.provides.client.spaces.create(intent.data);
              return { space, id: createNodeId(space.key) };
            }

            case SpaceAction.JOIN: {
              if (!clientPlugin) {
                return;
              }
              const { space } = await clientPlugin.provides.client.shell.joinSpace();
              return space && { space, id: createNodeId(space.key) };
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
              const intentPlugin = resolvePlugin(plugins, parseIntentPlugin);
              return intentPlugin?.provides.intent.dispatch({
                action: LayoutAction.OPEN_POPOVER,
                data: {
                  anchorId: `dxos.org/ui/navtree/${createNodeId(spaceKey)}`,
                  component: 'dxos.org/plugin/space/RenameSpacePopover',
                  subject: space,
                },
              });
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
              const intentPlugin = resolvePlugin(plugins, parseIntentPlugin);
              return intentPlugin?.provides.intent.dispatch({
                action: LayoutAction.OPEN_DIALOG,
                data: {
                  component: 'dxos.org/plugin/space/RestoreSpaceDialog',
                  subject: space,
                },
              });
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
              const intentPlugin = resolvePlugin(plugins, parseIntentPlugin);
              const subject =
                typeof intent.data.objectId === 'string' ? space?.db.getObjectById(intent.data.objectId) : null;
              return intentPlugin?.provides.intent.dispatch({
                action: LayoutAction.OPEN_POPOVER,
                data: {
                  anchorId: `dxos.org/ui/navtree/${intent.data.objectId}`,
                  component: 'dxos.org/plugin/space/RenameObjectPopover',
                  subject,
                },
              });
            }
          }
        },
      },
    },
  };
};

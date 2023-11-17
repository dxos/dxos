//
// Copyright 2023 DXOS.org
//

import { Folder as FolderIcon, Plus, type IconProps, Intersect } from '@phosphor-icons/react';
import { effect } from '@preact/signals-react';
import { type RevertDeepSignal, deepSignal } from 'deepsignal/react';
import React from 'react';

import { parseClientPlugin } from '@braneframe/plugin-client';
import { isGraphNode } from '@braneframe/plugin-graph';
import { Folder } from '@braneframe/types';
import {
  type PluginDefinition,
  type DispatchIntent,
  LayoutAction,
  resolvePlugin,
  parseIntentPlugin,
  parseLayoutPlugin,
  parseGraphPlugin,
  parseMetadataResolverPlugin,
} from '@dxos/app-framework';
import { EventSubscriptions, type UnsubscribeCallback } from '@dxos/async';
import { TypedObject, isTypedObject } from '@dxos/echo-schema';
import { LocalStorageStore } from '@dxos/local-storage';
import { type Client, PublicKey } from '@dxos/react-client';
import { type Space, SpaceProxy, getSpaceForObject, SpaceState } from '@dxos/react-client/echo';
import { inferRecordOrder } from '@dxos/util';

import { backupSpace } from './backup';
import {
  AwaitingObject,
  DialogRestoreSpace,
  EmptySpace,
  EmptyTree,
  FolderMain,
  MissingObject,
  PopoverRenameObject,
  PopoverRenameSpace,
  SpaceMain,
  SpacePresence,
  SpaceSettings,
} from './components';
import meta, { SPACE_PLUGIN } from './meta';
import translations from './translations';
import { SpaceAction, type SpacePluginProvides, type SpaceSettingsProps, type PluginState } from './types';
import { SHARED, getActiveSpace, hiddenSpacesToGraphNodes, indexSpaceFolder, isSpace, objectToGraphNode } from './util';

const ACTIVE_NODE_BROADCAST_INTERVAL = 30_000;

// TODO(wittjosiah): This ensures that typed objects are not proxied by deepsignal. Remove.
// https://github.com/luisherranz/deepsignal/issues/36
(globalThis as any)[SpaceProxy.name] = SpaceProxy;
(globalThis as any)[PublicKey.name] = PublicKey;
(globalThis as any)[Folder.name] = Folder;

export type SpacePluginOptions = {
  /**
   * Root folder structure is created on application first run if it does not yet exist.
   * This callback is invoked immediately following the creation of the root folder structure.
   *
   * @param params.client DXOS Client
   * @param params.defaultSpace Default space
   * @param params.personalSpaceFolder Folder representing the contents of the default space
   * @param params.sharedSpacesFolder Folder ordering all other space folders, stored in default space where contents is cross-space references
   * @param params.dispatch Function to dispatch intents
   */
  onFirstRun?: (params: {
    client: Client;
    defaultSpace: Space;
    personalSpaceFolder: Folder;
    sharedSpacesFolder: Folder;
    dispatch: DispatchIntent;
  }) => void;
};

export const SpacePlugin = ({ onFirstRun }: SpacePluginOptions = {}): PluginDefinition<SpacePluginProvides> => {
  const settings = new LocalStorageStore<SpaceSettingsProps>(SPACE_PLUGIN);
  const state = deepSignal<PluginState>({
    awaiting: undefined,
    viewers: [],
  }) as RevertDeepSignal<PluginState>;
  const subscriptions = new EventSubscriptions();
  const spaceSubscriptions = new EventSubscriptions();
  const graphSubscriptions = new Map<string, UnsubscribeCallback>();
  let handleKeyDown: (event: KeyboardEvent) => void;

  return {
    meta,
    ready: async (plugins) => {
      settings.prop(settings.values.$showHidden!, 'show-hidden', LocalStorageStore.bool);
      const intentPlugin = resolvePlugin(plugins, parseIntentPlugin);
      const graphPlugin = resolvePlugin(plugins, parseGraphPlugin);
      const clientPlugin = resolvePlugin(plugins, parseClientPlugin);
      const layoutPlugin = resolvePlugin(plugins, parseLayoutPlugin);
      if (!clientPlugin || !layoutPlugin || !intentPlugin || !graphPlugin) {
        return;
      }

      const client = clientPlugin.provides.client;
      const graph = graphPlugin.provides.graph;
      const layout = layoutPlugin.provides.layout;
      const dispatch = intentPlugin.provides.intent.dispatch;

      // Create root folder structure.
      const defaultSpace = client.spaces.default;
      if (clientPlugin.provides.firstRun) {
        // TODO(wittjosiah): These should be guarunteed to be unique within the space.
        const personalSpaceFolder = defaultSpace.db.add(new Folder({ name: client.spaces.default.key.toHex() }));
        const sharedSpacesFolder = defaultSpace.db.add(new Folder({ name: SHARED }));
        onFirstRun?.({
          client,
          defaultSpace,
          personalSpaceFolder,
          sharedSpacesFolder,
          dispatch,
        });
      }

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

          const folder = await indexSpaceFolder({ space, defaultSpace });

          await dispatch({
            action: LayoutAction.ACTIVATE,
            data: { id: folder.id },
          });
        });
      }

      // Broadcast active node to other peers in the space.
      subscriptions.add(
        effect(() => {
          const send = () => {
            const identity = client.halo.identity.get();
            const space = getActiveSpace(graph, layout.active);
            if (identity && space && layout.active) {
              void space.postMessage('viewing', {
                identityKey: identity.identityKey.toHex(),
                spaceKey: space.key.toHex(),
                added: [layout.active],
                removed: [layout.previous],
              });
            }
          };

          setInterval(() => send(), ACTIVE_NODE_BROADCAST_INTERVAL);
          send();
        }),
      );

      // TODO(wittjosiah): Remove. The SDK should provide a way to do migrations.
      const introduceRootSpaceFolder = (space: Space) => {
        if (space.state.get() !== SpaceState.READY) {
          return;
        }

        if (space.properties[Folder.schema.typename]) {
          return;
        }

        const [folder] = space.db.query(Folder.filter({ name: space.key.toHex() })).objects;
        space.properties[Folder.schema.typename] = folder;
      };

      // TODO(wittjosiah): Remove. The SDK should provide a way to do migrations.
      const combineAndCleanupMultipleRootSpaceFolders = (space: Space) => {
        const rootFolder = space.properties[Folder.schema.typename];
        if (!rootFolder) {
          return;
        }

        const spaceFolders = space.db.query(Folder.filter({ name: space.key.toHex() })).objects;
        if (spaceFolders.length <= 1) {
          return;
        }

        rootFolder.objects = spaceFolders.flatMap(({ objects }) => objects);
      };

      // Listen for active nodes from other peers in the space.
      subscriptions.add(
        client.spaces.subscribe((spaces) => {
          spaceSubscriptions.clear();
          spaces.forEach((space) => {
            spaceSubscriptions.add(
              effect(() => {
                introduceRootSpaceFolder(space);
                combineAndCleanupMultipleRootSpaceFolders(space);
              }),
            );

            spaceSubscriptions.add(
              space.listen('viewing', (message) => {
                const { added, removed } = message.payload;
                const identityKey = PublicKey.safeFrom(message.payload.identityKey);
                const spaceKey = PublicKey.safeFrom(message.payload.spaceKey);
                if (identityKey && spaceKey && Array.isArray(added) && Array.isArray(removed)) {
                  const newViewers = [
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
                  newViewers.sort((a, b) => b.lastSeen - a.lastSeen);
                  state.viewers = newViewers;
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
          const space = getActiveSpace(graph, layout.active);
          if (space) {
            void client.shell.shareSpace({ spaceKey: space.key });
          }
        }
      };
      window.addEventListener('keydown', handleKeyDown);
    },
    unload: async () => {
      settings.close();
      spaceSubscriptions.clear();
      subscriptions.clear();
      graphSubscriptions.forEach((cb) => cb());
      graphSubscriptions.clear();
      window.removeEventListener('keydown', handleKeyDown);
    },
    provides: {
      space: state as RevertDeepSignal<PluginState>,
      settings: settings.values,
      translations,
      root: () => (state.awaiting ? <AwaitingObject id={state.awaiting} /> : null),
      metadata: {
        records: {
          [Folder.schema.typename]: {
            placeholder: ['unnamed folder label', { ns: SPACE_PLUGIN }],
            icon: (props: IconProps) => <FolderIcon {...props} />,
          },
        },
      },
      surface: {
        component: ({ data, role }) => {
          switch (role) {
            case 'main':
              // TODO(wittjosiah): ItemID length constant.
              return isSpace(data.active) ? (
                <SpaceMain space={data.active} />
              ) : data.active instanceof Folder ? (
                <FolderMain folder={data.active} />
              ) : typeof data.active === 'string' && data.active.length === 64 ? (
                <MissingObject id={data.active} />
              ) : null;
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
              return isTypedObject(data.object) ? <SpacePresence object={data.object} /> : null;
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
          const clientPlugin = resolvePlugin(plugins, parseClientPlugin);
          const metadataPlugin = resolvePlugin(plugins, parseMetadataResolverPlugin);

          const client = clientPlugin?.provides.client;
          const dispatch = intentPlugin?.provides.intent.dispatch;
          const resolve = metadataPlugin?.provides.metadata.resolver;

          if (!dispatch || !resolve || !client) {
            return;
          }

          // Ensure default space is first.
          const defaultFolder = client.spaces.default.properties[Folder.schema.typename];
          graphSubscriptions.get(client.spaces.default.key.toHex())?.();
          graphSubscriptions.set(
            client.spaces.default.key.toHex(),
            objectToGraphNode({ object: defaultFolder, parent, dispatch, resolve }),
          );

          let spacesOrder: Folder | undefined;
          const [groupNode] = parent.addNode(SPACE_PLUGIN, {
            id: SHARED,
            label: ['shared spaces label', { ns: SPACE_PLUGIN }],
            actions: [
              {
                id: 'create-space',
                label: ['create space label', { ns: 'os' }],
                icon: (props) => <Plus {...props} />,
                properties: {
                  disposition: 'toolbar',
                  testId: 'spacePlugin.createSpace',
                },
                invoke: () =>
                  dispatch({
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
                  dispatch([
                    {
                      plugin: SPACE_PLUGIN,
                      action: SpaceAction.JOIN,
                    },
                    {
                      action: LayoutAction.ACTIVATE,
                    },
                  ]),
              },
            ],
            properties: {
              testId: 'spacePlugin.sharedSpaces',
              role: 'branch',
              // TODO(burdon): Factor out palette constants.
              palette: 'pink',
              childrenPersistenceClass: 'folder',
              onRearrangeChildren: (nextOrder: TypedObject[]) => {
                if (!spacesOrder) {
                  const nextObjectOrder = new Folder({
                    name: SHARED,
                    objects: nextOrder,
                  });
                  client.spaces.default.db.add(nextObjectOrder);
                  spacesOrder = nextObjectOrder;
                } else {
                  spacesOrder.objects = nextOrder;
                }
                updateSpacesOrder({ objects: [spacesOrder] });
              },
            },
          });

          const updateSpacesOrder = ({ objects: spacesOrders }: { objects: Folder[] }) => {
            spacesOrder = spacesOrders[0];
            groupNode.childrenMap = inferRecordOrder(
              groupNode.childrenMap,
              spacesOrder?.objects.map(({ id }) => id),
            );
          };
          const spacesOrderQuery = client.spaces.default.db.query(Folder.filter({ name: SHARED }));
          updateSpacesOrder(spacesOrderQuery);
          graphSubscriptions.set(SHARED, spacesOrderQuery.subscribe(updateSpacesOrder));

          const foldersToGraphNodes = (folders: Folder[]) => {
            const spaceFolders = new Set<Folder>(
              client.spaces.get().map((space) => space.properties[Folder.schema.typename]),
            );

            folders
              .filter((folder) => spaceFolders.has(folder))
              .forEach((folder) => {
                graphSubscriptions.get(folder.id)?.();
                graphSubscriptions.set(
                  folder.id,
                  objectToGraphNode({
                    object: folder,
                    parent: folder.name === client.spaces.default.key.toHex() ? parent : groupNode,
                    dispatch,
                    resolve,
                  }),
                );
              });
            groupNode.childrenMap = inferRecordOrder(
              groupNode.childrenMap,
              spacesOrder?.objects.map(({ id }) => id),
            );
          };
          const foldersQuery = client.spaces.query(Folder.filter());
          const unsubscribe = foldersQuery.subscribe(({ objects: folders }) => foldersToGraphNodes(folders));
          foldersToGraphNodes(foldersQuery.objects);

          const spacesSubscription = client.spaces.subscribe((spaces) => {
            foldersToGraphNodes(foldersQuery.objects);

            hiddenSpacesToGraphNodes({
              parent,
              hidden: settings.values.showHidden,
              spaces,
              dispatch,
            });
          });

          const unsubscribeHidden = settings.values.$showHidden!.subscribe(() => {
            hiddenSpacesToGraphNodes({
              parent,
              hidden: settings.values.showHidden,
              spaces: client.spaces.get(),
              dispatch,
            });
          });

          return () => {
            unsubscribe();
            unsubscribeHidden();
            spacesSubscription.unsubscribe();
            graphSubscriptions.forEach((cb) => cb());
            graphSubscriptions.clear();
          };
        },
      },
      intent: {
        resolver: async (intent, plugins) => {
          const clientPlugin = resolvePlugin(plugins, parseClientPlugin);
          const client = clientPlugin?.provides.client;
          switch (intent.action) {
            case SpaceAction.CREATE: {
              if (!client) {
                return;
              }
              const defaultSpace = client.spaces.default;
              const {
                objects: [sharedSpacesFolder],
              } = defaultSpace.db.query(Folder.filter({ name: SHARED }));
              const space = await client.spaces.create(intent.data);
              const folder = new Folder({ name: space.key.toHex() });
              space.properties[Folder.schema.typename] = folder;
              sharedSpacesFolder.objects.push(folder);
              return { space, id: space.key.toHex() };
            }

            case SpaceAction.JOIN: {
              if (!client) {
                return;
              }
              const defaultSpace = client.spaces.default;
              const { space } = await client.shell.joinSpace();
              if (space) {
                const folder = await indexSpaceFolder({ space, defaultSpace });
                return { space, id: folder.id };
              }
              break;
            }

            case SpaceAction.WAIT_FOR_OBJECT: {
              state.awaiting = intent.data.id;
              return true;
            }

            case SpaceAction.SHARE: {
              const spaceKey = intent.data?.spaceKey && PublicKey.from(intent.data.spaceKey);
              if (clientPlugin && spaceKey) {
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
                  anchorId: `dxos.org/ui/navtree/${intent.data.id}`,
                  component: 'dxos.org/plugin/space/RenameSpacePopover',
                  subject: intent.data.space,
                },
              });
            }
            case SpaceAction.OPEN: {
              void intent.data.space.internal.open();
              break;
            }

            case SpaceAction.CLOSE: {
              void intent.data.space.internal.close();
              break;
            }

            case SpaceAction.BACKUP: {
              const space = intent.data.space;
              if (space instanceof SpaceProxy) {
                // TODO(wittjosiah): Expose translations helper from theme plugin provides.
                const backupBlob = await backupSpace(space, 'unnamed document');
                const spaceName = space.properties.name || 'unnamed space';
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
                  subject: intent.data.space,
                },
              });
            }

            case SpaceAction.ADD_OBJECT: {
              const spaceKey = intent.data?.spaceKey && PublicKey.from(intent.data.spaceKey);
              const space = spaceKey && clientPlugin?.provides.client.spaces.get(spaceKey);
              if (space && intent.data.object) {
                return space.db.add(intent.data.object);
              }
              break;
            }

            case SpaceAction.REMOVE_OBJECT: {
              const space = getSpaceForObject(intent.data.object);
              if (space) {
                space.db.remove(intent.data.object);
                return true;
              }
              break;
            }

            case SpaceAction.RENAME_OBJECT: {
              const intentPlugin = resolvePlugin(plugins, parseIntentPlugin);
              return intentPlugin?.provides.intent.dispatch({
                action: LayoutAction.OPEN_POPOVER,
                data: {
                  anchorId: `dxos.org/ui/navtree/${intent.data.object.id}`,
                  component: 'dxos.org/plugin/space/RenameObjectPopover',
                  subject: intent.data.object,
                },
              });
            }

            case SpaceAction.ADD_TO_FOLDER: {
              const folder = intent.data.folder;
              const object = intent.data.object;
              if (folder instanceof Folder && object instanceof TypedObject) {
                folder.objects.push(intent.data.object);
                return { id: object.id };
              }
              break;
            }

            case SpaceAction.REMOVE_FROM_FOLDER: {
              const folder = intent.data.folder;
              const object = intent.data.object;
              if (folder instanceof Folder && object instanceof TypedObject) {
                const layoutPlugin = resolvePlugin(plugins, parseLayoutPlugin);
                const intentPlugin = resolvePlugin(plugins, parseIntentPlugin);
                if (layoutPlugin?.provides.layout.active === intent.data.object.id) {
                  await intentPlugin?.provides.intent.dispatch({
                    action: LayoutAction.ACTIVATE,
                    data: { id: undefined },
                  });
                }

                const index = folder.objects.indexOf(object);
                folder.objects.splice(index, 1);
                return true;
              }
              break;
            }

            case SpaceAction.TOGGLE_HIDDEN: {
              settings.values.showHidden = intent.data?.state ?? !settings.values.showHidden;
              return true;
            }
          }
        },
      },
    },
  };
};

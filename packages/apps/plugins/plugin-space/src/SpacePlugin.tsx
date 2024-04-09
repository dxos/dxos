//
// Copyright 2023 DXOS.org
//

import { type IconProps, Folder as FolderIcon, Plus, SignIn } from '@phosphor-icons/react';
import { effect } from '@preact/signals-core';
import localforage from 'localforage';
import React from 'react';

import { type ClientPluginProvides, parseClientPlugin } from '@braneframe/plugin-client';
import { getSpaceProperty, setSpaceProperty } from '@braneframe/plugin-client';
import { isGraphNode } from '@braneframe/plugin-graph';
import { FolderType } from '@braneframe/types';
import {
  type IntentDispatcher,
  type PluginDefinition,
  type Plugin,
  NavigationAction,
  resolvePlugin,
  parseIntentPlugin,
  parseNavigationPlugin,
  parseGraphPlugin,
  parseMetadataResolverPlugin,
  LayoutAction,
} from '@dxos/app-framework';
import { EventSubscriptions, type UnsubscribeCallback } from '@dxos/async';
import * as E from '@dxos/echo-schema';
import { type Identifiable } from '@dxos/echo-schema';
import { invariant } from '@dxos/invariant';
import { LocalStorageStore } from '@dxos/local-storage';
import { log } from '@dxos/log';
import { Migrations } from '@dxos/migrations';
import { type Client, PublicKey } from '@dxos/react-client';
import { type Space, SpaceProxy, getSpace, type PropertiesProps } from '@dxos/react-client/echo';
import { Dialog } from '@dxos/react-ui';
import { InvitationManager, type InvitationManagerProps, osTranslations, ClipboardProvider } from '@dxos/shell/react';
import { ComplexMap } from '@dxos/util';

import {
  AwaitingObject,
  EmptySpace,
  EmptyTree,
  FolderMain,
  MissingObject,
  PersistenceStatus,
  PopoverRemoveObject,
  PopoverRenameObject,
  PopoverRenameSpace,
  ShareSpaceButton,
  SmallPresence,
  SmallPresenceLive,
  SpaceMain,
  SpacePresence,
  SpaceSettings,
} from './components';
import meta, { SPACE_PLUGIN } from './meta';
import { saveSpaceToDisk, loadSpaceFromDisk, clone } from './serializer';
import translations from './translations';
import {
  SpaceAction,
  type SpacePluginProvides,
  type SpaceSettingsProps,
  type PluginState,
  SPACE_DIRECTORY_HANDLE,
} from './types';
import { SHARED, getActiveSpace, isSpace, updateGraphWithSpace, prepareSpaceForMigration } from './util';

const ACTIVE_NODE_BROADCAST_INTERVAL = 30_000;

export type SpacePluginOptions = {
  /**
   * Root folder structure is created on application first run if it does not yet exist.
   * This callback is invoked immediately following the creation of the root folder structure.
   *
   * @param params.client DXOS Client
   * @param params.defaultSpace Default space
   * @param params.personalSpaceFolder Folder representing the contents of the default space
   * @param params.dispatch Function to dispatch intents
   */
  onFirstRun?: (params: {
    client: Client;
    defaultSpace: Space;
    personalSpaceFolder: FolderType;
    dispatch: IntentDispatcher;
  }) => Promise<void>;
};

export const SpacePlugin = ({ onFirstRun }: SpacePluginOptions = {}): PluginDefinition<SpacePluginProvides> => {
  const settings = new LocalStorageStore<SpaceSettingsProps>(SPACE_PLUGIN);
  const state = E.object<PluginState>({
    awaiting: undefined,
    viewersByObject: {},
    viewersByIdentity: new ComplexMap(PublicKey.hash),
  });
  const subscriptions = new EventSubscriptions();
  const spaceSubscriptions = new EventSubscriptions();
  const graphSubscriptions = new Map<string, UnsubscribeCallback>();
  let directory: FileSystemDirectoryHandle | null;

  let clientPlugin: Plugin<ClientPluginProvides> | undefined;

  return {
    meta,
    ready: async (plugins) => {
      settings.prop({
        key: 'showHidden',
        storageKey: 'show-hidden',
        type: LocalStorageStore.bool({ allowUndefined: true }),
      });

      const intentPlugin = resolvePlugin(plugins, parseIntentPlugin);
      const graphPlugin = resolvePlugin(plugins, parseGraphPlugin);
      const navigationPlugin = resolvePlugin(plugins, parseNavigationPlugin);
      clientPlugin = resolvePlugin(plugins, parseClientPlugin);
      if (!clientPlugin || !navigationPlugin || !intentPlugin || !graphPlugin) {
        return;
      }

      const client = clientPlugin.provides.client;
      const graph = graphPlugin.provides.graph;
      const location = navigationPlugin.provides.location;
      const dispatch = intentPlugin.provides.intent.dispatch;

      // Create root folder structure.
      if (clientPlugin.provides.firstRun) {
        const defaultSpace = client.spaces.default;
        const personalSpaceFolder = E.object(FolderType, { objects: [] });
        setSpaceProperty(defaultSpace, FolderType.typename, personalSpaceFolder);
        if (Migrations.versionProperty) {
          setSpaceProperty(defaultSpace, Migrations.versionProperty, Migrations.targetVersion);
        }
        await onFirstRun?.({
          client,
          defaultSpace,
          personalSpaceFolder,
          dispatch,
        });
      }

      // Check if opening app from invitation code.
      const searchParams = new URLSearchParams(window.location.search);
      const spaceInvitationCode = searchParams.get('spaceInvitationCode');
      if (spaceInvitationCode) {
        void client.shell.joinSpace({ invitationCode: spaceInvitationCode }).then(async ({ space, target }) => {
          if (!space) {
            return;
          }

          const url = new URL(window.location.href);
          const params = Array.from(url.searchParams.entries());
          const [name] = params.find(([_, value]) => value === spaceInvitationCode) ?? [null, null];
          if (name) {
            url.searchParams.delete(name);
            history.replaceState({}, document.title, url.href);
          }

          await dispatch({
            action: NavigationAction.ACTIVATE,
            data: { id: target ?? space.key.toHex() },
          });
        });
      }

      // Broadcast active node to other peers in the space.
      subscriptions.add(
        effect(() => {
          const send = () => {
            const identity = client.halo.identity.get();
            const space = getActiveSpace(graph, location.active);
            if (identity && space && location.active) {
              void space
                .postMessage('viewing', {
                  identityKey: identity.identityKey.toHex(),
                  spaceKey: space.key.toHex(),
                  added: [location.active],
                  removed: [location.previous],
                })
                .catch((err) => {
                  log.warn('Failed to broadcast active node for presence', { err: err.message });
                });
            }
          };

          setInterval(() => send(), ACTIVE_NODE_BROADCAST_INTERVAL);
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
                  added.forEach((objectIdAny) => {
                    if (objectIdAny) {
                      const objectId = objectIdAny.toString();
                      if (!(objectId in state.viewersByObject)) {
                        state.viewersByObject[objectId] = new ComplexMap(PublicKey.hash);
                      }
                      state.viewersByObject[objectId]!.set(identityKey, { lastSeen: Date.now(), spaceKey });
                      if (!state.viewersByIdentity.has(identityKey)) {
                        state.viewersByIdentity.set(identityKey, new Set());
                      }
                      state.viewersByIdentity.get(identityKey)!.add(objectId);
                    }
                  });
                  removed.forEach((objectIdAny) => {
                    if (objectIdAny) {
                      const objectId = objectIdAny.toString();
                      state.viewersByObject[objectId]?.delete(identityKey);
                      state.viewersByIdentity.get(identityKey)?.delete(objectId);
                      // It’s okay for these to be empty sets/maps, reduces churn.
                    }
                  });
                }
              }),
            );
          });
        }).unsubscribe,
      );
    },
    unload: async () => {
      settings.close();
      spaceSubscriptions.clear();
      subscriptions.clear();
      graphSubscriptions.forEach((cb) => cb());
      graphSubscriptions.clear();
    },
    provides: {
      space: state,
      settings: settings.values,
      translations: [...translations, osTranslations],
      root: () => (state.awaiting ? <AwaitingObject id={state.awaiting} /> : null),
      metadata: {
        records: {
          [FolderType.typename]: {
            placeholder: ['unnamed folder label', { ns: SPACE_PLUGIN }],
            icon: (props: IconProps) => <FolderIcon {...props} />,
          },
        },
      },
      echo: {
        schema: [FolderType],
      },
      surface: {
        component: ({ data, role }) => {
          switch (role) {
            case 'main':
              // TODO(wittjosiah): ItemID length constant.
              return isSpace(data.active) ? (
                <SpaceMain space={data.active} />
              ) : data.active instanceof FolderType ? (
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
              if (data.component === 'dxos.org/plugin/space/InvitationManagerDialog') {
                return (
                  <Dialog.Content>
                    <ClipboardProvider>
                      <InvitationManager active {...(data.subject as InvitationManagerProps)} />
                    </ClipboardProvider>
                  </Dialog.Content>
                );
              } else {
                return null;
              }
            case 'popover':
              if (data.component === 'dxos.org/plugin/space/RenameSpacePopover' && isSpace(data.subject)) {
                return <PopoverRenameSpace space={data.subject} />;
              } else if (
                data.component === 'dxos.org/plugin/space/RenameObjectPopover' &&
                E.isEchoReactiveObject(data.subject)
              ) {
                return <PopoverRenameObject object={data.subject} />;
              } else if (
                data.component === 'dxos.org/plugin/space/RemoveObjectPopover' &&
                data.subject &&
                typeof data.subject === 'object' &&
                E.isReactiveProxy((data.subject as Record<string, any>)?.object)
              ) {
                return (
                  <PopoverRemoveObject
                    object={(data.subject as Record<string, any>)?.object}
                    folder={(data.subject as Record<string, any>)?.folder}
                  />
                );
              } else {
                return null;
              }
            case 'presence--glyph': {
              return E.isReactiveProxy(data.object) ? (
                <SmallPresenceLive viewers={state.viewersByObject[data.object.id]} />
              ) : (
                <SmallPresence count={0} />
              );
            }
            case 'navbar-start': {
              const space =
                isGraphNode(data.activeNode) && E.isReactiveProxy(data.activeNode.data)
                  ? getSpace(data.activeNode.data)
                  : undefined;
              return space ? <PersistenceStatus db={space.db} /> : null;
            }
            case 'navbar-end': {
              if (!E.isEchoReactiveObject(data.object)) {
                return null;
              }

              const defaultSpace = clientPlugin?.provides.client.spaces.default;
              const space = getSpace(data.object);
              return space && space !== defaultSpace
                ? {
                    node: (
                      <>
                        <SpacePresence object={data.object} />
                        <ShareSpaceButton spaceKey={space.key} />
                      </>
                    ),
                    disposition: 'hoist',
                  }
                : null;
            }
            case 'settings':
              return data.plugin === meta.id ? <SpaceSettings settings={settings.values} /> : null;
            default:
              return null;
          }
        },
      },
      graph: {
        builder: (plugins, graph) => {
          const intentPlugin = resolvePlugin(plugins, parseIntentPlugin);
          const clientPlugin = resolvePlugin(plugins, parseClientPlugin);
          const metadataPlugin = resolvePlugin(plugins, parseMetadataResolverPlugin);

          const client = clientPlugin?.provides.client;
          const dispatch = intentPlugin?.provides.intent.dispatch;
          const resolve = metadataPlugin?.provides.metadata.resolver;

          if (!dispatch || !resolve || !client || !client.spaces.isReady.get()) {
            return;
          }

          // Ensure default space is first.
          graphSubscriptions.get(client.spaces.default.key.toHex())?.();
          graphSubscriptions.set(
            client.spaces.default.key.toHex(),
            updateGraphWithSpace({ graph, space: client.spaces.default, isPersonalSpace: true, dispatch, resolve }),
          );

          // TODO(wittjosiah): Cannot be a Folder because Spaces are not TypedObjects so can't be saved in the database.
          //  Instead, we store order as an array of space keys.
          let spacesOrder: E.EchoReactiveObject<Record<string, any>> | undefined;
          const [groupNode] = graph.addNodes({
            id: SHARED,
            properties: {
              label: ['shared spaces label', { ns: SPACE_PLUGIN }],
              testId: 'spacePlugin.sharedSpaces',
              role: 'branch',
              palette: 'pink',
              childrenPersistenceClass: 'echo',
              onRearrangeChildren: (nextOrder: Space[]) => {
                if (!spacesOrder) {
                  const nextObjectOrder = client.spaces.default.db.add(
                    E.object({
                      key: SHARED,
                      order: nextOrder.map(({ key }) => key.toHex()),
                    }),
                  );
                  spacesOrder = nextObjectOrder;
                } else {
                  spacesOrder.order = nextOrder.map(({ key }) => key.toHex());
                }
                updateSpacesOrder(spacesOrder);
              },
            },
            edges: [['root', 'inbound']],
            nodes: [
              {
                id: SpaceAction.CREATE,
                data: () =>
                  dispatch({
                    plugin: SPACE_PLUGIN,
                    action: SpaceAction.CREATE,
                  }),
                properties: {
                  label: ['create space label', { ns: SPACE_PLUGIN }],
                  icon: (props: IconProps) => <Plus {...props} />,
                  disposition: 'toolbar',
                  testId: 'spacePlugin.createSpace',
                },
              },
              {
                id: SpaceAction.JOIN,
                data: () =>
                  dispatch([
                    {
                      plugin: SPACE_PLUGIN,
                      action: SpaceAction.JOIN,
                    },
                    {
                      action: NavigationAction.ACTIVATE,
                    },
                  ]),
                properties: {
                  label: ['join space label', { ns: SPACE_PLUGIN }],
                  icon: (props: IconProps) => <SignIn {...props} />,
                  testId: 'spacePlugin.joinSpace',
                },
              },
            ],
          });

          const updateSpacesOrder = (spacesOrder?: E.EchoReactiveObject<Record<string, any>>) => {
            if (!spacesOrder) {
              return;
            }

            graph.sortEdges(groupNode.id, 'outbound', spacesOrder.order);
          };
          const spacesOrderQuery = client.spaces.default.db.query({ key: SHARED });
          spacesOrder = spacesOrderQuery.objects[0];
          updateSpacesOrder(spacesOrderQuery.objects[0]);
          graphSubscriptions.set(
            SHARED,
            spacesOrderQuery.subscribe(({ objects }) => updateSpacesOrder(objects[0])),
          );

          const createSpaceNodes = (spaces: Space[]) => {
            spaces.forEach((space) => {
              graphSubscriptions.get(space.key.toHex())?.();
              graphSubscriptions.set(
                space.key.toHex(),
                updateGraphWithSpace({
                  graph,
                  space,
                  hidden: settings.values.showHidden,
                  isPersonalSpace: space === client.spaces.default,
                  dispatch,
                  resolve,
                }),
              );
            });

            updateSpacesOrder(spacesOrder);
          };

          const { unsubscribe } = client.spaces.subscribe((spaces) => createSpaceNodes(spaces));
          const unsubscribeHidden = effect(() => createSpaceNodes(client.spaces.get()));

          return () => {
            unsubscribe();
            unsubscribeHidden();
            graphSubscriptions.forEach((cb) => cb());
            graphSubscriptions.clear();
          };
        },
      },
      intent: {
        resolver: async (intent, plugins) => {
          const intentPlugin = resolvePlugin(plugins, parseIntentPlugin);
          const clientPlugin = resolvePlugin(plugins, parseClientPlugin);
          const client = clientPlugin?.provides.client;
          switch (intent.action) {
            case SpaceAction.WAIT_FOR_OBJECT: {
              state.awaiting = intent.data?.id;
              return { data: true };
            }

            case SpaceAction.CREATE: {
              if (!client) {
                return;
              }
              const defaultSpace = client.spaces.default;
              const {
                objects: [sharedSpacesFolder],
              } = defaultSpace.db.query({ key: SHARED });
              const space = await client.spaces.create(intent.data as PropertiesProps);

              const folder = E.object(FolderType, { objects: [] });
              setSpaceProperty(space, FolderType.typename, folder);
              await space.waitUntilReady();

              sharedSpacesFolder?.objects.push(folder);
              if (Migrations.versionProperty) {
                setSpaceProperty(space, Migrations.versionProperty, Migrations.targetVersion);
              }

              void intentPlugin?.provides.intent.dispatch({
                action: NavigationAction.ACTIVATE,
                data: { id: space.key.toHex() },
              });
              return { data: { space, id: space.key.toHex() } };
            }

            case SpaceAction.JOIN: {
              if (client) {
                const { space } = await client.shell.joinSpace();
                if (space) {
                  return { data: { space, id: space.key.toHex() } };
                }
              }
              break;
            }

            case SpaceAction.SHARE: {
              const navigationPlugin = resolvePlugin(plugins, parseNavigationPlugin);
              const spaceKey = intent.data?.spaceKey && PublicKey.from(intent.data.spaceKey);
              if (clientPlugin && spaceKey) {
                const target = navigationPlugin?.provides.location.active;
                const result = await clientPlugin.provides.client.shell.shareSpace({ spaceKey, target });
                return { data: result };
              }
              break;
            }

            case SpaceAction.RENAME: {
              const { caller, space } = intent.data ?? {};
              if (typeof caller === 'string' && space instanceof SpaceProxy) {
                return {
                  intents: [
                    [
                      {
                        action: LayoutAction.SET_LAYOUT,
                        data: {
                          element: 'popover',
                          anchorId: `dxos.org/ui/${caller}/${space.key.toHex()}`,
                          component: 'dxos.org/plugin/space/RenameSpacePopover',
                          subject: space,
                        },
                      },
                    ],
                  ],
                };
              }
              break;
            }

            case SpaceAction.OPEN: {
              const space = intent.data?.space;
              if (space instanceof SpaceProxy) {
                await space.internal.open();
                return { data: true };
              }
              break;
            }

            case SpaceAction.CLOSE: {
              const space = intent.data?.space;
              if (space instanceof SpaceProxy) {
                await space.internal.close();
                return { data: true };
              }
              break;
            }

            case SpaceAction.MIGRATE: {
              const space = intent.data?.space;
              if (space instanceof SpaceProxy) {
                prepareSpaceForMigration(space);
                const result = Migrations.migrate(space, intent.data?.version);
                return { data: result };
              }
              break;
            }

            case SpaceAction.SELECT_DIRECTORY: {
              const handle = await (window as any).showDirectoryPicker({ mode: 'readwrite' });
              directory = handle;
              await localforage.setItem(SPACE_DIRECTORY_HANDLE, handle);
              return { data: handle };
            }

            case SpaceAction.SAVE: {
              const space = intent.data?.space;
              if (space instanceof SpaceProxy) {
                if (!directory) {
                  directory = await localforage.getItem(SPACE_DIRECTORY_HANDLE);
                }
                if (!directory) {
                  // TODO(wittjosiah): Consider implementing this as an intent chain by returning other intents.
                  const intentPlugin = resolvePlugin(plugins, parseIntentPlugin);
                  const result = await intentPlugin?.provides.intent.dispatch({
                    plugin: SPACE_PLUGIN,
                    action: SpaceAction.SELECT_DIRECTORY,
                  });
                  directory = result?.data;
                }
                invariant(directory, 'No directory selected.');
                if ((directory as any).queryPermission && (await (directory as any).queryPermission()) !== 'granted') {
                  // TODO(mykola): Is it Chrome-specific?
                  await (directory as any).requestPermission?.({ mode: 'readwrite' });
                }
                await saveSpaceToDisk({ space, directory }).catch((error) => {
                  log.catch(error);
                });
                return { data: true };
              }
              break;
            }

            case SpaceAction.LOAD: {
              const space = intent.data?.space;
              if (space instanceof SpaceProxy) {
                const directory = await (window as any).showDirectoryPicker({ mode: 'readwrite' });
                await loadSpaceFromDisk({ space, directory });
                return { data: true };
              }
              break;
            }

            case SpaceAction.ADD_OBJECT: {
              const object = intent.data?.object ?? intent.data?.result;
              if (!E.isReactiveProxy(object)) {
                return;
              }

              if (intent.data?.target instanceof FolderType) {
                intent.data?.target.objects.push(object as Identifiable);
                return { data: object };
              }

              if (intent.data?.target instanceof SpaceProxy) {
                const space = intent.data.target;
                const folder = getSpaceProperty(space, FolderType.typename);
                if (folder instanceof FolderType) {
                  folder.objects.push(object as Identifiable);
                  return { data: object };
                } else {
                  return { data: space.db.add(object) };
                }
              }
              break;
            }

            case SpaceAction.REMOVE_OBJECT: {
              const object = intent.data?.object ?? intent.data?.result;
              const caller = intent.data?.caller;
              if (E.isReactiveProxy(object) && caller) {
                return {
                  intents: [
                    [
                      {
                        action: LayoutAction.SET_LAYOUT,
                        data: {
                          element: 'popover',
                          anchorId: `dxos.org/ui/${caller}/${object.id}`,
                          component: 'dxos.org/plugin/space/RemoveObjectPopover',
                          subject: {
                            object,
                            folder: intent.data?.folder,
                          },
                        },
                      },
                    ],
                  ],
                };
              }
              break;
            }

            case SpaceAction.RENAME_OBJECT: {
              const object = intent.data?.object ?? intent.data?.result;
              const caller = intent.data?.caller;
              if (E.isReactiveProxy(object) && caller) {
                return {
                  intents: [
                    [
                      {
                        action: LayoutAction.SET_LAYOUT,
                        data: {
                          element: 'popover',
                          anchorId: `dxos.org/ui/${caller}/${object.id}`,
                          component: 'dxos.org/plugin/space/RenameObjectPopover',
                          subject: object,
                        },
                      },
                    ],
                  ],
                };
              }
              break;
            }

            case SpaceAction.DUPLICATE_OBJECT: {
              const originalObject = intent.data?.object ?? intent.data?.result;
              if (!E.isEchoReactiveObject(originalObject)) {
                return;
              }

              const newObject = await clone(originalObject);
              return {
                intents: [
                  [{ action: SpaceAction.ADD_OBJECT, data: { object: newObject, target: intent.data?.target } }],
                ],
              };
            }

            case SpaceAction.TOGGLE_HIDDEN: {
              settings.values.showHidden = intent.data?.state ?? !settings.values.showHidden;
              return { data: true };
            }
          }
        },
      },
    },
  };
};

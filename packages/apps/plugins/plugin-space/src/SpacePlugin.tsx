//
// Copyright 2023 DXOS.org
//

import { type IconProps, Plus, SignIn, CardsThree } from '@phosphor-icons/react';
import { effect } from '@preact/signals-core';
import localforage from 'localforage';
import React from 'react';

import { type ClientPluginProvides, parseClientPlugin } from '@braneframe/plugin-client';
import { isGraphNode } from '@braneframe/plugin-graph';
import { ObservabilityAction } from '@braneframe/plugin-observability/meta';
import { CollectionType, SpaceSerializer, cloneObject } from '@braneframe/types';
import {
  type IntentDispatcher,
  type IntentPluginProvides,
  LayoutAction,
  Surface,
  type LocationProvides,
  NavigationAction,
  type Plugin,
  type PluginDefinition,
  activeIds,
  firstMainId,
  parseIntentPlugin,
  parseNavigationPlugin,
  parseMetadataResolverPlugin,
  resolvePlugin,
} from '@dxos/app-framework';
import { EventSubscriptions, type UnsubscribeCallback } from '@dxos/async';
import { type Identifiable, isReactiveObject } from '@dxos/echo-schema';
import { invariant } from '@dxos/invariant';
import { LocalStorageStore } from '@dxos/local-storage';
import { log } from '@dxos/log';
import { Migrations } from '@dxos/migrations';
import { type Client, PublicKey } from '@dxos/react-client';
import {
  type EchoReactiveObject,
  type PropertiesTypeProps,
  type ReactiveObject,
  type Space,
  create,
  Expando,
  Filter,
  fullyQualifiedId,
  getSpace,
  getTypename,
  isEchoObject,
  isSpace,
  SpaceState,
} from '@dxos/react-client/echo';
import { Dialog } from '@dxos/react-ui';
import { InvitationManager, type InvitationManagerProps, osTranslations, ClipboardProvider } from '@dxos/shell/react';
import { ComplexMap } from '@dxos/util';

import {
  AwaitingObject,
  CollectionMain,
  CollectionSection,
  EmptySpace,
  EmptyTree,
  MenuFooter,
  MissingObject,
  PopoverRemoveObject,
  PopoverRenameObject,
  PopoverRenameSpace,
  ShareSpaceButton,
  SmallPresence,
  SmallPresenceLive,
  SpacePresence,
  SpaceSettings,
} from './components';
import meta, { SPACE_PLUGIN } from './meta';
import translations from './translations';
import {
  SpaceAction,
  type SpacePluginProvides,
  type SpaceSettingsProps,
  type PluginState,
  SPACE_DIRECTORY_HANDLE,
} from './types';
import { SHARED, updateGraphWithSpace } from './util';

const ACTIVE_NODE_BROADCAST_INTERVAL = 30_000;
const OBJECT_ID_LENGTH = 60; // 33 (space id) + 26 (object id) + 1 (separator).

export const parseSpacePlugin = (plugin?: Plugin) =>
  Array.isArray((plugin?.provides as any).space?.enabled) ? (plugin as Plugin<SpacePluginProvides>) : undefined;

export type SpacePluginOptions = {
  /**
   * Root collection structure is created on application first run if it does not yet exist.
   * This callback is invoked immediately following the creation of the root collection structure.
   *
   * @param params.client DXOS Client
   * @param params.dispatch Function to dispatch intents
   */
  onFirstRun?: (params: { client: Client; dispatch: IntentDispatcher }) => Promise<void>;

  /**
   * Query string parameter to look for space invitation codes.
   */
  spaceInvitationParam?: string;
};

export const SpacePlugin = ({
  onFirstRun,
  spaceInvitationParam = 'spaceInvitationCode',
}: SpacePluginOptions = {}): PluginDefinition<SpacePluginProvides> => {
  const settings = new LocalStorageStore<SpaceSettingsProps>(SPACE_PLUGIN);
  const state = create<PluginState>({
    awaiting: undefined,
    viewersByObject: {},
    viewersByIdentity: new ComplexMap(PublicKey.hash),
    enabled: [],
  });
  const subscriptions = new EventSubscriptions();
  const spaceSubscriptions = new EventSubscriptions();
  const graphSubscriptions = new Map<string, UnsubscribeCallback>();
  const serializer = new SpaceSerializer();

  let clientPlugin: Plugin<ClientPluginProvides> | undefined;
  let intentPlugin: Plugin<IntentPluginProvides> | undefined;
  let navigationPlugin: Plugin<LocationProvides> | undefined;

  return {
    meta,
    ready: async (plugins) => {
      settings.prop({
        key: 'showHidden',
        storageKey: 'show-hidden',
        type: LocalStorageStore.bool({ allowUndefined: true }),
      });

      intentPlugin = resolvePlugin(plugins, parseIntentPlugin);
      navigationPlugin = resolvePlugin(plugins, parseNavigationPlugin);
      clientPlugin = resolvePlugin(plugins, parseClientPlugin);
      if (!clientPlugin || !navigationPlugin || !intentPlugin) {
        return;
      }

      const client = clientPlugin.provides.client;
      const location = navigationPlugin.provides.location;
      const dispatch = intentPlugin.provides.intent.dispatch;

      // Create root collection structure.
      if (clientPlugin.provides.firstRun) {
        const defaultSpace = client.spaces.default;
        const personalSpaceCollection = create(CollectionType, { objects: [], views: {} });
        defaultSpace.properties[CollectionType.typename] = personalSpaceCollection;
        if (Migrations.versionProperty) {
          defaultSpace.properties[Migrations.versionProperty] = Migrations.targetVersion;
        }
        await onFirstRun?.({ client, dispatch });
      }

      // Enable spaces.
      state.enabled.push(client.spaces.default.id);
      subscriptions.add(
        effect(() => {
          Array.from(activeIds(location.active)).forEach((part) => {
            // TODO(Zan): Don't allow undefined in activeIds.
            if (part === undefined) {
              return;
            }

            const [spaceId] = part.split(':');
            const index = state.enabled.findIndex((id) => spaceId === id);
            if (spaceId && index === -1) {
              state.enabled.push(spaceId);
            }
          });
        }),
      );

      // Check if opening app from invitation code.
      const searchParams = new URLSearchParams(window.location.search);
      const spaceInvitationCode = searchParams.get(spaceInvitationParam);
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
            action: NavigationAction.OPEN,
            data: { main: [target ?? space.id] },
          });
        });
      }

      // Broadcast active node to other peers in the space.
      subscriptions.add(
        effect(() => {
          const send = () => {
            const identity = client.halo.identity.get();
            if (identity && location.active) {
              // TODO(wittjosiah): Group by space.
              Array.from(activeIds(location.active)).forEach((part) => {
                // TODO(Zan): Don't allow undefined in activeIds.
                if (part === undefined) {
                  return;
                }

                const [spaceId] = part.split(':');
                const spaces = client.spaces.get();
                const space = spaces.find((space) => space.id === spaceId);
                if (space) {
                  void space
                    .postMessage('viewing', {
                      identityKey: identity.identityKey.toHex(),
                      added: [part],
                      removed: location.closed ? [location.closed].flat() : [],
                    })
                    // TODO(burdon): This seems defensive; why would this fail? Backoff interval.
                    .catch((err) => {
                      log.warn('Failed to broadcast active node for presence.', { err: err.message });
                    });
                }
              });
            }
          };

          setInterval(() => send(), ACTIVE_NODE_BROADCAST_INTERVAL);
          send();
        }),
      );

      // Listen for active nodes from other peers in the space.
      subscriptions.add(
        effect(() => {
          spaceSubscriptions.clear();
          client.spaces
            .get()
            // TODO(burdon): Load all?
            .filter((space) => !!state.enabled.find((id) => id === space.id))
            .forEach((space) => {
              spaceSubscriptions.add(
                space.listen('viewing', (message) => {
                  const { added, removed } = message.payload;
                  const identityKey = PublicKey.safeFrom(message.payload.identityKey);
                  if (identityKey && Array.isArray(added) && Array.isArray(removed)) {
                    added.forEach((id) => {
                      if (typeof id === 'string') {
                        if (!(id in state.viewersByObject)) {
                          state.viewersByObject[id] = new ComplexMap(PublicKey.hash);
                        }
                        state.viewersByObject[id]!.set(identityKey, { lastSeen: Date.now() });
                        if (!state.viewersByIdentity.has(identityKey)) {
                          state.viewersByIdentity.set(identityKey, new Set());
                        }
                        state.viewersByIdentity.get(identityKey)!.add(id);
                      }
                    });

                    removed.forEach((id) => {
                      if (typeof id === 'string') {
                        state.viewersByObject[id]?.delete(identityKey);
                        state.viewersByIdentity.get(identityKey)?.delete(id);
                        // It’s okay for these to be empty sets/maps, reduces churn.
                      }
                    });
                  }
                }),
              );
            });
        }),
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
          [CollectionType.typename]: {
            placeholder: ['unnamed collection label', { ns: SPACE_PLUGIN }],
            icon: (props: IconProps) => <CardsThree {...props} />,
          },
        },
      },
      echo: {
        schema: [CollectionType],
      },
      surface: {
        component: ({ data, role, ...rest }) => {
          const primary = data.active ?? data.object;
          switch (role) {
            case 'article':
            case 'main':
              // TODO(wittjosiah): ItemID length constant.
              return isSpace(primary) ? (
                <Surface data={{ active: primary.properties[CollectionType.typename] }} role={role} {...rest} />
              ) : primary instanceof CollectionType ? (
                { node: <CollectionMain collection={primary} />, disposition: 'fallback' }
              ) : typeof primary === 'string' && primary.length === OBJECT_ID_LENGTH ? (
                <MissingObject id={primary} />
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
                isReactiveObject(data.subject)
              ) {
                return <PopoverRenameObject object={data.subject} />;
              } else if (
                data.component === 'dxos.org/plugin/space/RemoveObjectPopover' &&
                data.subject &&
                typeof data.subject === 'object' &&
                isReactiveObject((data.subject as Record<string, any>)?.object)
              ) {
                return (
                  <PopoverRemoveObject
                    object={(data.subject as Record<string, any>)?.object}
                    collection={(data.subject as Record<string, any>)?.collection}
                  />
                );
              } else {
                return null;
              }
            case 'presence--glyph': {
              return isReactiveObject(data.object) ? (
                <SmallPresenceLive
                  viewers={state.viewersByObject[data.object.id]}
                  onCloseClick={() => {
                    const objectId = fullyQualifiedId(data.object as ReactiveObject<any>);
                    return intentPlugin?.provides.intent.dispatch({
                      action: NavigationAction.CLOSE,
                      data: { activeParts: { main: [objectId], sidebar: [objectId], complementary: [objectId] } },
                    });
                  }}
                />
              ) : (
                <SmallPresence count={0} />
              );
            }
            case 'navbar-start': {
              return null;
            }
            case 'navbar-end': {
              if (!isEchoObject(data.object) && !isSpace(data.object)) {
                return null;
              }

              const client = clientPlugin?.provides.client;
              const defaultSpace = client?.halo.identity.get() && client?.spaces.default;
              const space = isSpace(data.object) ? data.object : getSpace(data.object);
              const object = isSpace(data.object)
                ? data.object.state.get() === SpaceState.READY
                  ? (space?.properties[CollectionType.typename] as CollectionType)
                  : undefined
                : data.object;
              return space && space !== defaultSpace && object
                ? {
                    node: (
                      <>
                        <SpacePresence object={object} />
                        <ShareSpaceButton spaceId={space.id} />
                      </>
                    ),
                    disposition: 'hoist',
                  }
                : null;
            }
            case 'section':
              return data.object instanceof CollectionType ? <CollectionSection collection={data.object} /> : null;
            case 'settings':
              return data.plugin === meta.id ? <SpaceSettings settings={settings.values} /> : null;
            case 'menu-footer':
              if (!isEchoObject(data.object)) {
                return null;
              } else {
                return <MenuFooter object={data.object} />;
              }
            default:
              return null;
          }
        },
      },
      graph: {
        builder: (plugins, graph) => {
          const clientPlugin = resolvePlugin(plugins, parseClientPlugin);
          const metadataPlugin = resolvePlugin(plugins, parseMetadataResolverPlugin);

          const client = clientPlugin?.provides.client;
          const dispatch = intentPlugin?.provides.intent.dispatch;
          const resolve = metadataPlugin?.provides.metadata.resolver;

          if (!dispatch || !resolve || !client || !client.spaces.isReady.get()) {
            return;
          }

          // Ensure default space is first.
          graphSubscriptions.get(client.spaces.default.id)?.();
          graphSubscriptions.set(
            client.spaces.default.id,
            updateGraphWithSpace({ graph, space: client.spaces.default, isPersonalSpace: true, dispatch, resolve }),
          );

          // TODO(wittjosiah): Cannot be a Folder because Spaces are not TypedObjects so can't be saved in the database.
          //  Instead, we store order as an array of space ids.
          let spacesOrder: EchoReactiveObject<Record<string, any>> | undefined;
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
                    create({
                      key: SHARED,
                      order: nextOrder.map(({ id }) => id),
                    }),
                  );
                  spacesOrder = nextObjectOrder;
                } else {
                  spacesOrder.order = nextOrder.map(({ id }) => id);
                }
                updateSpacesOrder(spacesOrder);
              },
            },
            edges: [['root', 'inbound']],
            nodes: [
              {
                id: SpaceAction.CREATE,
                data: () =>
                  dispatch([
                    {
                      plugin: SPACE_PLUGIN,
                      action: SpaceAction.CREATE,
                    },
                    {
                      action: NavigationAction.OPEN,
                    },
                  ]),
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
                      action: NavigationAction.OPEN,
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

          const updateSpacesOrder = (orderObject?: EchoReactiveObject<Record<string, any>>) => {
            if (!spacesOrder) {
              spacesOrder = orderObject;
            }

            if (!orderObject) {
              return;
            }

            graph.sortEdges(groupNode.id, 'outbound', orderObject.order);
          };
          const spacesOrderQuery = client.spaces.default.db.query(Filter.schema(Expando, { key: SHARED }));
          graphSubscriptions.set(
            SHARED,
            spacesOrderQuery.subscribe(({ objects }) => updateSpacesOrder(objects[0]), { fire: true }),
          );

          const createSpaceNodes = (spaces: Space[]) => {
            spaces.forEach((space) => {
              graphSubscriptions.get(space.id)?.();
              graphSubscriptions.set(
                space.id,
                updateGraphWithSpace({
                  graph,
                  space,
                  enabled: !!state.enabled.find((id) => id === space.id),
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
                objects: [sharedSpacesCollection],
              } = await defaultSpace.db.query(Filter.schema(Expando, { key: SHARED })).run();
              const space = await client.spaces.create(intent.data as PropertiesTypeProps);
              await space.waitUntilReady();

              const collection = create(CollectionType, { objects: [], views: {} });
              space.properties[CollectionType.typename] = collection;
              state.enabled.push(space.id);

              sharedSpacesCollection?.objects.push(collection);
              if (Migrations.versionProperty) {
                space.properties[Migrations.versionProperty] = Migrations.targetVersion;
              }

              return {
                data: { space, id: space.id, activeParts: { main: [space.id] } },

                intents: [
                  [
                    {
                      action: ObservabilityAction.SEND_EVENT,
                      data: {
                        name: 'space.create',
                        properties: {
                          spaceId: space.id,
                        },
                      },
                    },
                  ],
                ],
              };
            }

            case SpaceAction.JOIN: {
              if (client) {
                const { space } = await client.shell.joinSpace();
                if (space) {
                  state.enabled.push(space.id);
                  return {
                    data: { space, id: space.id, activeParts: { main: [space.id] } },

                    intents: [
                      [
                        {
                          action: ObservabilityAction.SEND_EVENT,
                          data: {
                            name: 'space.join',
                            properties: {
                              spaceId: space.id,
                            },
                          },
                        },
                      ],
                    ],
                  };
                }
              }
              break;
            }

            case SpaceAction.SHARE: {
              const spaceId = intent.data?.spaceId;
              if (clientPlugin && typeof spaceId === 'string') {
                const target = firstMainId(navigationPlugin?.provides.location.active);
                const result = await clientPlugin.provides.client.shell.shareSpace({ spaceId, target });
                return {
                  data: result,
                  intents: [
                    [
                      {
                        action: ObservabilityAction.SEND_EVENT,
                        data: {
                          name: 'space.share',
                          properties: {
                            spaceId,
                          },
                        },
                      },
                    ],
                  ],
                };
              }
              break;
            }

            case SpaceAction.RENAME: {
              const { caller, space } = intent.data ?? {};
              if (typeof caller === 'string' && isSpace(space)) {
                return {
                  intents: [
                    [
                      {
                        action: LayoutAction.SET_LAYOUT,
                        data: {
                          element: 'popover',
                          anchorId: `dxos.org/ui/${caller}/${space.id}`,
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
              if (isSpace(space)) {
                await space.open();
                return { data: true };
              }
              break;
            }

            case SpaceAction.CLOSE: {
              const space = intent.data?.space;
              if (isSpace(space)) {
                await space.close();
                return { data: true };
              }
              break;
            }

            case SpaceAction.MIGRATE: {
              const space = intent.data?.space;
              if (isSpace(space)) {
                const result = Migrations.migrate(space, intent.data?.version);
                return {
                  data: result,
                  intents: [
                    [
                      {
                        action: ObservabilityAction.SEND_EVENT,
                        data: {
                          name: 'space.migrate',
                          properties: {
                            spaceId: space.id,
                            version: intent.data?.version,
                          },
                        },
                      },
                    ],
                  ],
                };
              }
              break;
            }

            case SpaceAction.SELECT_DIRECTORY: {
              const rootDir = await (window as any).showDirectoryPicker({ mode: 'readwrite' });
              await localforage.setItem(SPACE_DIRECTORY_HANDLE, rootDir);
              return { data: rootDir };
            }

            case SpaceAction.SAVE: {
              const space = intent.data?.space;
              let rootDir: FileSystemDirectoryHandle | null = await localforage.getItem(SPACE_DIRECTORY_HANDLE);
              if (!rootDir) {
                const result = await intentPlugin?.provides.intent.dispatch({
                  plugin: SPACE_PLUGIN,
                  action: SpaceAction.SELECT_DIRECTORY,
                });
                rootDir = result?.data as FileSystemDirectoryHandle;
                invariant(rootDir);
              }

              // TODO(burdon): Resolve casts.
              if ((rootDir as any).queryPermission && (await (rootDir as any).queryPermission()) !== 'granted') {
                // TODO(mykola): Is it Chrome-specific?
                await (rootDir as any).requestPermission?.({ mode: 'readwrite' });
              }
              await serializer.save({ space, directory: rootDir }).catch((err) => {
                void localforage.removeItem(SPACE_DIRECTORY_HANDLE);
                log.catch(err);
              });
              return {
                data: true,
                intents: [
                  [
                    {
                      action: ObservabilityAction.SEND_EVENT,
                      data: {
                        name: 'space.save',
                        properties: {
                          spaceId: space.id,
                        },
                      },
                    },
                  ],
                ],
              };
            }

            case SpaceAction.LOAD: {
              const space = intent.data?.space;
              if (isSpace(space)) {
                const directory = await (window as any).showDirectoryPicker({ mode: 'readwrite' });
                await serializer.load({ space, directory }).catch(log.catch);
                return {
                  data: true,
                  intents: [
                    [
                      {
                        action: ObservabilityAction.SEND_EVENT,
                        data: {
                          name: 'space.load',
                          properties: {
                            spaceId: space.id,
                          },
                        },
                      },
                    ],
                  ],
                };
              }
              break;
            }

            case SpaceAction.ADD_OBJECT: {
              const object = intent.data?.object ?? intent.data?.result;
              if (!isReactiveObject(object)) {
                return;
              }

              if (intent.data?.target instanceof CollectionType) {
                intent.data?.target.objects.push(object as Identifiable);
                return { data: { ...object, activeParts: { main: [fullyQualifiedId(object)] } } };
              }

              const space = intent.data?.target;
              if (isSpace(space)) {
                const collection = space.properties[CollectionType.typename];
                if (collection instanceof CollectionType) {
                  collection.objects.push(object as Identifiable);
                } else {
                  // TODO(wittjosiah): Can't add non-echo objects by including in a collection because of types.
                  const collection = create(CollectionType, { objects: [object as Identifiable], views: {} });
                  space.properties[CollectionType.typename] = collection;
                }
                return {
                  data: { ...object, activeParts: { main: [fullyQualifiedId(object)] } },
                  intents: [
                    [
                      {
                        action: ObservabilityAction.SEND_EVENT,
                        data: {
                          name: 'space.object.add',
                          properties: {
                            spaceId: space.id,
                            objectId: object.id,
                            typename: getTypename(object),
                          },
                        },
                      },
                    ],
                  ],
                };
              }
              break;
            }

            case SpaceAction.REMOVE_OBJECT: {
              const object = intent.data?.object ?? intent.data?.result;
              const caller = intent.data?.caller;
              if (isReactiveObject(object) && caller) {
                return {
                  intents: [
                    [
                      {
                        action: LayoutAction.SET_LAYOUT,
                        data: {
                          element: 'popover',
                          anchorId: `dxos.org/ui/${caller}/${fullyQualifiedId(object)}`,
                          component: 'dxos.org/plugin/space/RemoveObjectPopover',
                          subject: {
                            object,
                            collection: intent.data?.collection,
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
              if (isReactiveObject(object) && caller) {
                return {
                  intents: [
                    [
                      {
                        action: LayoutAction.SET_LAYOUT,
                        data: {
                          element: 'popover',
                          anchorId: `dxos.org/ui/${caller}/${fullyQualifiedId(object)}`,
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
              if (!isEchoObject(originalObject)) {
                return;
              }

              const newObject = await cloneObject(originalObject);
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

            case SpaceAction.ENABLE: {
              const space = intent.data?.space;
              if (isSpace(space)) {
                state.enabled.push(space.id);
                return { data: true };
              }
              break;
            }
          }
        },
      },
    },
  };
};

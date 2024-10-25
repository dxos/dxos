//
// Copyright 2024 DXOS.org
//

import { signal } from '@preact/signals-core';
import React from 'react';

import {
  type IntentDispatcher,
  type IntentPluginProvides,
  LayoutAction,
  type LocationProvides,
  NavigationAction,
  type Plugin,
  type PluginDefinition,
  Surface,
  firstIdInPart,
  openIds,
  parseGraphPlugin,
  parseIntentPlugin,
  parseMetadataResolverPlugin,
  parseNavigationPlugin,
  resolvePlugin,
} from '@dxos/app-framework';
import { EventSubscriptions, type Trigger, type UnsubscribeCallback } from '@dxos/async';
import { type HasId, isReactiveObject } from '@dxos/echo-schema';
import { scheduledEffect } from '@dxos/echo-signals/core';
import { LocalStorageStore } from '@dxos/local-storage';
import { log } from '@dxos/log';
import { Migrations } from '@dxos/migrations';
import { type AttentionPluginProvides, parseAttentionPlugin } from '@dxos/plugin-attention';
import { type ClientPluginProvides, parseClientPlugin } from '@dxos/plugin-client';
import { type Node, createExtension, memoize, toSignal } from '@dxos/plugin-graph';
import { ObservabilityAction } from '@dxos/plugin-observability/meta';
import { type Client, PublicKey } from '@dxos/react-client';
import {
  Expando,
  type EchoReactiveObject,
  Filter,
  type PropertiesTypeProps,
  type Space,
  SpaceState,
  create,
  fullyQualifiedId,
  getSpace,
  getTypename,
  isEchoObject,
  isSpace,
  loadObjectReferences,
  parseFullyQualifiedId,
} from '@dxos/react-client/echo';
import { Dialog } from '@dxos/react-ui';
import { ClipboardProvider, InvitationManager, type InvitationManagerProps, osTranslations } from '@dxos/shell/react';
import { ComplexMap, nonNullable, reduceGroupBy } from '@dxos/util';

import {
  AwaitingObject,
  CollectionMain,
  CollectionSection,
  DefaultObjectSettings,
  MenuFooter,
  MissingObject,
  PopoverRenameObject,
  PopoverRenameSpace,
  SaveStatus,
  ShareSpaceButton,
  SmallPresence,
  SmallPresenceLive,
  SpacePresence,
  SpaceSettings,
  SyncStatus,
} from './components';
import meta, { SPACE_PLUGIN, SpaceAction } from './meta';
import translations from './translations';
import { CollectionType, type PluginState, type SpacePluginProvides, type SpaceSettingsProps } from './types';
import {
  COMPOSER_SPACE_LOCK,
  SHARED,
  SPACES,
  SPACE_TYPE,
  cloneObject,
  constructObjectActionGroups,
  constructObjectActions,
  constructSpaceActionGroups,
  constructSpaceActions,
  constructSpaceNode,
  createObjectNode,
  getNestedObjects,
  memoizeQuery,
} from './util';

const ACTIVE_NODE_BROADCAST_INTERVAL = 30_000;
const OBJECT_ID_LENGTH = 60; // 33 (space id) + 26 (object id) + 1 (separator).
const SPACE_MAX_OBJECTS = 500;
// https://stackoverflow.com/a/19016910
const DIRECTORY_TYPE = 'text/directory';

export const parseSpacePlugin = (plugin?: Plugin) =>
  Array.isArray((plugin?.provides as any).space?.enabled) ? (plugin as Plugin<SpacePluginProvides>) : undefined;

export type SpacePluginOptions = {
  /**
   * Fired when first run logic should be executed.
   *
   * This trigger is invoked once the HALO identity is created but must only be run in one instance of the application.
   * As such it cannot depend directly on the HALO identity event.
   */
  firstRun?: Trigger<void>;

  /**
   * Root collection structure is created on application first run if it does not yet exist.
   * This callback is invoked immediately following the creation of the root collection structure.
   *
   * @param params.client DXOS Client
   * @param params.dispatch Function to dispatch intents
   */
  onFirstRun?: (params: { client: Client; dispatch: IntentDispatcher }) => Promise<void>;
};

export const SpacePlugin = ({
  firstRun,
  onFirstRun,
}: SpacePluginOptions = {}): PluginDefinition<SpacePluginProvides> => {
  const settings = new LocalStorageStore<SpaceSettingsProps>(SPACE_PLUGIN, {
    onSpaceCreate: 'dxos.org/plugin/markdown/action/create',
  });
  const state = new LocalStorageStore<PluginState>(SPACE_PLUGIN, {
    awaiting: undefined,
    spaceNames: {},
    viewersByObject: {},
    viewersByIdentity: new ComplexMap(PublicKey.hash),
    sdkMigrationRunning: {},
  });
  const subscriptions = new EventSubscriptions();
  const spaceSubscriptions = new EventSubscriptions();
  const graphSubscriptions = new Map<string, UnsubscribeCallback>();

  let clientPlugin: Plugin<ClientPluginProvides> | undefined;
  let intentPlugin: Plugin<IntentPluginProvides> | undefined;
  let navigationPlugin: Plugin<LocationProvides> | undefined;
  let attentionPlugin: Plugin<AttentionPluginProvides> | undefined;

  const onSpaceReady = async () => {
    if (!clientPlugin || !navigationPlugin || !attentionPlugin) {
      return;
    }

    const client = clientPlugin.provides.client;
    const location = navigationPlugin.provides.location;
    const attention = attentionPlugin.provides.attention;
    const defaultSpace = client.spaces.default;

    // Initialize space sharing lock in default space.
    if (typeof defaultSpace.properties[COMPOSER_SPACE_LOCK] !== 'boolean') {
      defaultSpace.properties[COMPOSER_SPACE_LOCK] = true;
    }

    const {
      objects: [spacesOrder],
    } = await defaultSpace.db.query(Filter.schema(Expando, { key: SHARED })).run();
    if (!spacesOrder) {
      // TODO(wittjosiah): Cannot be a Folder because Spaces are not TypedObjects so can't be saved in the database.
      //  Instead, we store order as an array of space ids.
      defaultSpace.db.add(create({ key: SHARED, order: [] }));
    }

    // Cache space names.
    subscriptions.add(
      client.spaces.subscribe(async (spaces) => {
        // TODO(wittjosiah): Remove. This is a hack to be able to migrate the default space properties.
        if (defaultSpace.state.get() === SpaceState.SPACE_REQUIRES_MIGRATION) {
          await defaultSpace.internal.migrate();
        }

        spaces
          .filter((space) => space.state.get() === SpaceState.SPACE_READY)
          .forEach((space) => {
            subscriptions.add(
              scheduledEffect(
                () => ({ name: space.properties.name }),
                ({ name }) => (state.values.spaceNames[space.id] = name),
              ),
            );
          });
      }).unsubscribe,
    );

    // Broadcast active node to other peers in the space.
    subscriptions.add(
      scheduledEffect(
        () => ({
          ids: openIds(location.active),
          removed: location.closed ? [location.closed].flat() : [],
        }),
        ({ ids, removed }) => {
          const send = () => {
            const spaces = client.spaces.get();
            const identity = client.halo.identity.get();
            if (identity && location.active) {
              // Group parts by space for efficient messaging.
              const idsBySpace = reduceGroupBy(ids, (id) => {
                const [spaceId] = id.split(':'); // TODO(burdon): Factor out.
                return spaceId;
              });

              // NOTE: Ensure all spaces are included so that we send the correct `removed` object arrays.
              for (const space of spaces) {
                if (!idsBySpace.has(space.id)) {
                  idsBySpace.set(space.id, []);
                }
              }

              for (const [spaceId, ids] of idsBySpace) {
                const space = spaces.find((space) => space.id === spaceId);
                if (!space) {
                  continue;
                }

                void space
                  .postMessage('viewing', {
                    identityKey: identity.identityKey.toHex(),
                    attended: attention.attended ? [...attention.attended] : [],
                    added: ids,
                    // TODO(Zan): When we re-open a part, we should remove it from the removed list in the navigation plugin.
                    removed: removed.filter((id) => !ids.includes(id)),
                  })
                  // TODO(burdon): This seems defensive; why would this fail? Backoff interval.
                  .catch((err) => {
                    log.warn('Failed to broadcast active node for presence.', { err: err.message });
                  });
              }
            }
          };

          send();
          const interval = setInterval(() => send(), ACTIVE_NODE_BROADCAST_INTERVAL);
          return () => clearInterval(interval);
        },
      ),
    );

    // Listen for active nodes from other peers in the space.
    subscriptions.add(
      client.spaces.subscribe((spaces) => {
        spaceSubscriptions.clear();
        spaces.forEach((space) => {
          spaceSubscriptions.add(
            space.listen('viewing', (message) => {
              const { added, removed, attended } = message.payload;

              const identityKey = PublicKey.safeFrom(message.payload.identityKey);
              if (identityKey && Array.isArray(added) && Array.isArray(removed)) {
                added.forEach((id) => {
                  if (typeof id === 'string') {
                    if (!(id in state.values.viewersByObject)) {
                      state.values.viewersByObject[id] = new ComplexMap(PublicKey.hash);
                    }
                    state.values.viewersByObject[id]!.set(identityKey, {
                      lastSeen: Date.now(),
                      currentlyAttended: new Set(attended).has(id),
                    });
                    if (!state.values.viewersByIdentity.has(identityKey)) {
                      state.values.viewersByIdentity.set(identityKey, new Set());
                    }
                    state.values.viewersByIdentity.get(identityKey)!.add(id);
                  }
                });

                removed.forEach((id) => {
                  if (typeof id === 'string') {
                    state.values.viewersByObject[id]?.delete(identityKey);
                    state.values.viewersByIdentity.get(identityKey)?.delete(id);
                    // It’s okay for these to be empty sets/maps, reduces churn.
                  }
                });
              }
            }),
          );
        });
      }).unsubscribe,
    );
  };

  return {
    meta,
    ready: async (plugins) => {
      settings.prop({
        key: 'showHidden',
        storageKey: 'show-hidden',
        type: LocalStorageStore.bool({ allowUndefined: true }),
      });

      state.prop({
        key: 'spaceNames',
        storageKey: 'space-names',
        type: LocalStorageStore.json<Record<string, string>>(),
      });

      navigationPlugin = resolvePlugin(plugins, parseNavigationPlugin);
      attentionPlugin = resolvePlugin(plugins, parseAttentionPlugin);
      clientPlugin = resolvePlugin(plugins, parseClientPlugin);
      intentPlugin = resolvePlugin(plugins, parseIntentPlugin);
      if (!clientPlugin || !intentPlugin) {
        return;
      }

      const client = clientPlugin.provides.client;
      const dispatch = intentPlugin.provides.intent.dispatch;

      const handleFirstRun = async () => {
        const defaultSpace = client.spaces.default;

        // Create root collection structure.
        defaultSpace.properties[CollectionType.typename] = create(CollectionType, { objects: [], views: {} });
        if (Migrations.versionProperty) {
          defaultSpace.properties[Migrations.versionProperty] = Migrations.targetVersion;
        }
        await onFirstRun?.({ client, dispatch });
      };

      // No need to unsubscribe because this observable completes when spaces are ready.
      client.spaces.isReady.subscribe(async (ready) => {
        if (ready) {
          await clientPlugin?.provides.client.spaces.default.waitUntilReady();
          if (firstRun) {
            void firstRun?.wait().then(handleFirstRun);
          } else {
            await handleFirstRun();
          }

          await onSpaceReady();
        }
      });
    },
    unload: async () => {
      settings.close();
      spaceSubscriptions.clear();
      subscriptions.clear();
      graphSubscriptions.forEach((cb) => cb());
      graphSubscriptions.clear();
    },
    provides: {
      space: state.values,
      settings: settings.values,
      translations: [...translations, osTranslations],
      root: () => (state.values.awaiting ? <AwaitingObject id={state.values.awaiting} /> : null),
      metadata: {
        records: {
          [CollectionType.typename]: {
            placeholder: ['unnamed collection label', { ns: SPACE_PLUGIN }],
            icon: 'ph--cards-three--regular',
            // TODO(wittjosiah): Move out of metadata.
            loadReferences: (collection: CollectionType) =>
              loadObjectReferences(collection, (collection) => [
                ...collection.objects,
                ...Object.values(collection.views),
              ]),
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
              // TODO(wittjosiah): Need to avoid shotgun parsing space state everywhere.
              return isSpace(primary) && primary.state.get() === SpaceState.SPACE_READY ? (
                <Surface
                  data={{ active: primary.properties[CollectionType.typename], id: primary.id }}
                  role={role}
                  {...rest}
                />
              ) : primary instanceof CollectionType ? (
                { node: <CollectionMain collection={primary} />, disposition: 'fallback' }
              ) : typeof primary === 'string' && primary.length === OBJECT_ID_LENGTH ? (
                <MissingObject id={primary} />
              ) : null;
            case 'complementary--settings':
              return isEchoObject(data.subject) ? <DefaultObjectSettings object={data.subject} /> : null;
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
              }
              if (data.component === 'dxos.org/plugin/space/RenameObjectPopover' && isReactiveObject(data.subject)) {
                return <PopoverRenameObject object={data.subject} />;
              }
              return null;
            // TODO(burdon): Add role name syntax to minimal plugin docs.
            case 'presence--glyph': {
              return isReactiveObject(data.object) ? (
                <SmallPresenceLive viewers={state.values.viewersByObject[fullyQualifiedId(data.object)]} />
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

              const space = isSpace(data.object) ? data.object : getSpace(data.object);
              const object = isSpace(data.object)
                ? data.object.state.get() === SpaceState.SPACE_READY
                  ? (space?.properties[CollectionType.typename] as CollectionType)
                  : undefined
                : data.object;
              return space && object
                ? {
                    node: (
                      <>
                        <SpacePresence object={object} />
                        {space.properties[COMPOSER_SPACE_LOCK] ? null : <ShareSpaceButton spaceId={space.id} />}
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
            case 'status': {
              return (
                <>
                  <SyncStatus />
                  <SaveStatus />
                </>
              );
            }
            default:
              return null;
          }
        },
      },
      graph: {
        builder: (plugins) => {
          const clientPlugin = resolvePlugin(plugins, parseClientPlugin);
          const metadataPlugin = resolvePlugin(plugins, parseMetadataResolverPlugin);
          const graphPlugin = resolvePlugin(plugins, parseGraphPlugin);

          const client = clientPlugin?.provides.client;
          const dispatch = intentPlugin?.provides.intent.dispatch;
          const resolve = metadataPlugin?.provides.metadata.resolver;
          const graph = graphPlugin?.provides.graph;

          if (!graph || !dispatch || !resolve || !client) {
            return [];
          }

          return [
            // Create spaces group node.
            createExtension({
              id: `${SPACE_PLUGIN}/root`,
              filter: (node): node is Node<null> => node.id === 'root',
              connector: () => {
                const isReady = toSignal(
                  (onChange) => {
                    let defaultSpaceUnsubscribe: UnsubscribeCallback | undefined;
                    // No need to unsubscribe because this observable completes when spaces are ready.
                    client.spaces.isReady.subscribe((ready) => {
                      if (ready) {
                        defaultSpaceUnsubscribe = client.spaces.default.state.subscribe(() => onChange()).unsubscribe;
                      }
                    });

                    return () => defaultSpaceUnsubscribe?.();
                  },
                  () => client.spaces.isReady.get() && client.spaces.default.state.get() === SpaceState.SPACE_READY,
                );
                if (!isReady) {
                  return [];
                }

                return [
                  {
                    id: SPACES,
                    type: SPACES,
                    properties: {
                      label: ['spaces label', { ns: SPACE_PLUGIN }],
                      palette: 'teal',
                      testId: 'spacePlugin.spaces',
                      role: 'branch',
                      childrenPersistenceClass: 'echo',
                      onRearrangeChildren: async (nextOrder: Space[]) => {
                        // NOTE: This is needed to ensure order is updated by next animation frame.
                        // TODO(wittjosiah): Is there a better way to do this?
                        //   If not, graph should be passed as an argument to the extension.
                        graph._sortEdges(
                          SPACES,
                          'outbound',
                          nextOrder.map(({ id }) => id),
                        );

                        const {
                          objects: [spacesOrder],
                        } = await client.spaces.default.db.query(Filter.schema(Expando, { key: SHARED })).run();
                        if (spacesOrder) {
                          spacesOrder.order = nextOrder.map(({ id }) => id);
                        } else {
                          log.warn('spaces order object not found');
                        }
                      },
                    },
                  },
                ];
              },
            }),

            // Create space nodes.
            createExtension({
              id: SPACES,
              filter: (node): node is Node<null> => node.id === SPACES,
              actions: () => [
                {
                  id: SpaceAction.CREATE,
                  data: async () => {
                    await dispatch([
                      {
                        plugin: SPACE_PLUGIN,
                        action: SpaceAction.CREATE,
                      },
                      {
                        action: NavigationAction.OPEN,
                      },
                    ]);
                  },
                  properties: {
                    label: ['create space label', { ns: SPACE_PLUGIN }],
                    icon: 'ph--plus--regular',
                    disposition: 'toolbar',
                    testId: 'spacePlugin.createSpace',
                  },
                },
                {
                  id: SpaceAction.JOIN,
                  data: async () => {
                    await dispatch([
                      {
                        plugin: SPACE_PLUGIN,
                        action: SpaceAction.JOIN,
                      },
                      {
                        action: NavigationAction.OPEN,
                      },
                    ]);
                  },
                  properties: {
                    label: ['join space label', { ns: SPACE_PLUGIN }],
                    icon: 'ph--sign-in--regular',
                    testId: 'spacePlugin.joinSpace',
                  },
                },
              ],
              connector: () => {
                const spaces = toSignal(
                  (onChange) => client.spaces.subscribe(() => onChange()).unsubscribe,
                  () => client.spaces.get(),
                );

                const isReady = toSignal(
                  (onChange) => client.spaces.isReady.subscribe(() => onChange()).unsubscribe,
                  () => client.spaces.isReady.get(),
                );

                if (!spaces || !isReady) {
                  return;
                }

                const [spacesOrder] = memoizeQuery(client.spaces.default, Filter.schema(Expando, { key: SHARED }));
                const order: string[] = spacesOrder?.order ?? [];
                const orderMap = new Map(order.map((id, index) => [id, index]));
                return [
                  ...spaces
                    .filter((space) => orderMap.has(space.id))
                    .sort((a, b) => orderMap.get(a.id)! - orderMap.get(b.id)!),
                  ...spaces.filter((space) => !orderMap.has(space.id)),
                ]
                  .filter((space) =>
                    settings.values.showHidden ? true : space.state.get() !== SpaceState.SPACE_INACTIVE,
                  )
                  .map((space) =>
                    constructSpaceNode({
                      space,
                      personal: space === client.spaces.default,
                      namesCache: state.values.spaceNames,
                      resolve,
                    }),
                  );
              },
            }),

            // Find an object by its fully qualified id.
            createExtension({
              id: `${SPACE_PLUGIN}/objects`,
              resolver: ({ id }) => {
                const [spaceId, objectId] = id.split(':');
                const space = client.spaces.get().find((space) => space.id === spaceId);
                if (!space) {
                  return;
                }

                const state = toSignal(
                  (onChange) => space.state.subscribe(() => onChange()).unsubscribe,
                  () => space.state.get(),
                  space.id,
                );
                if (state !== SpaceState.SPACE_READY) {
                  return;
                }

                const store = memoize(() => signal(space.db.getObjectById(objectId)), id);
                memoize(() => {
                  if (!store.value) {
                    void space.db.loadObjectById(objectId).then((o) => (store.value = o));
                  }
                }, id);
                const object = store.value;
                if (!object) {
                  return;
                }

                return createObjectNode({ object, space, resolve });
              },
            }),

            // Create space actions and action groups.
            createExtension({
              id: `${SPACE_PLUGIN}/actions`,
              filter: (node): node is Node<Space> => isSpace(node.data),
              actionGroups: ({ node }) => constructSpaceActionGroups({ space: node.data, dispatch }),
              actions: ({ node }) => {
                const space = node.data;
                return constructSpaceActions({
                  space,
                  dispatch,
                  personal: space === client.spaces.default,
                  migrating: state.values.sdkMigrationRunning[space.id],
                });
              },
            }),

            // Create nodes for objects in the root collection of a space.
            createExtension({
              id: `${SPACE_PLUGIN}/root-collection`,
              filter: (node): node is Node<Space> => isSpace(node.data),
              connector: ({ node }) => {
                const space = node.data;
                const state = toSignal(
                  (onChange) => space.state.subscribe(() => onChange()).unsubscribe,
                  () => space.state.get(),
                  space.id,
                );
                if (state !== SpaceState.SPACE_READY) {
                  return;
                }

                const collection = space.properties[CollectionType.typename] as CollectionType | undefined;
                if (!collection) {
                  return;
                }

                return collection.objects
                  .filter(nonNullable)
                  .map((object) => createObjectNode({ object, space, resolve }))
                  .filter(nonNullable);
              },
            }),

            // Create collection actions and action groups.
            createExtension({
              id: `${SPACE_PLUGIN}/object-actions`,
              filter: (node): node is Node<EchoReactiveObject<any>> => isEchoObject(node.data),
              actionGroups: ({ node }) => constructObjectActionGroups({ object: node.data, dispatch }),
              actions: ({ node }) => constructObjectActions({ node, dispatch }),
            }),

            // Create nodes for objects in collections.
            createExtension({
              id: `${SPACE_PLUGIN}/collection-objects`,
              filter: (node): node is Node<CollectionType> => node.data instanceof CollectionType,
              connector: ({ node }) => {
                const collection = node.data;
                const space = getSpace(collection);
                if (!space) {
                  return;
                }

                return collection.objects
                  .filter(nonNullable)
                  .map((object) => createObjectNode({ object, space, resolve }))
                  .filter(nonNullable);
              },
            }),

            // Create nodes for object settings.
            createExtension({
              id: `${SPACE_PLUGIN}/settings-for-subject`,
              resolver: ({ id }) => {
                // TODO(Zan): Find util (or make one).
                if (!id.endsWith('~settings')) {
                  return;
                }

                const [subjectId] = id.split('~');
                const [spaceId, objectId] = parseFullyQualifiedId(subjectId);
                const space = client.spaces.get().find((space) => space.id === spaceId);
                const object = toSignal(
                  (onChange) => {
                    const timeout = setTimeout(async () => {
                      await space?.db.loadObjectById(objectId);
                      onChange();
                    });

                    return () => clearTimeout(timeout);
                  },
                  () => space?.db.getObjectById(objectId),
                  subjectId,
                );
                if (!object || !subjectId) {
                  return;
                }

                const meta = resolve(getTypename(object) ?? '');
                const label = meta.label?.(object) ||
                  object.name ||
                  meta.placeholder || ['unnamed object settings label', { ns: SPACE_PLUGIN }];

                return {
                  id,
                  type: 'orphan-settings-for-subject',
                  data: null,
                  properties: {
                    icon: 'ph--gear--regular',
                    label,
                    object,
                  },
                };
              },
            }),
          ];
        },
        serializer: (plugins) => {
          const dispatch = resolvePlugin(plugins, parseIntentPlugin)?.provides.intent.dispatch;
          if (!dispatch) {
            return [];
          }

          return [
            {
              inputType: SPACES,
              outputType: DIRECTORY_TYPE,
              serialize: (node) => ({
                name: translations[0]['en-US'][SPACE_PLUGIN]['spaces label'],
                data: translations[0]['en-US'][SPACE_PLUGIN]['spaces label'],
                type: DIRECTORY_TYPE,
              }),
              deserialize: () => {
                // No-op.
              },
            },
            {
              inputType: SPACE_TYPE,
              outputType: DIRECTORY_TYPE,
              serialize: (node) => ({
                name: node.data.properties.name ?? translations[0]['en-US'][SPACE_PLUGIN]['unnamed space label'],
                data: node.data.properties.name ?? translations[0]['en-US'][SPACE_PLUGIN]['unnamed space label'],
                type: DIRECTORY_TYPE,
              }),
              deserialize: async (data) => {
                const result = await dispatch({
                  plugin: SPACE_PLUGIN,
                  action: SpaceAction.CREATE,
                  data: { name: data.name },
                });
                return result?.data.space;
              },
            },
            {
              inputType: CollectionType.typename,
              outputType: DIRECTORY_TYPE,
              serialize: (node) => ({
                name: node.data.name ?? translations[0]['en-US'][SPACE_PLUGIN]['unnamed collection label'],
                data: node.data.name ?? translations[0]['en-US'][SPACE_PLUGIN]['unnamed collection label'],
                type: DIRECTORY_TYPE,
              }),
              deserialize: async (data, ancestors) => {
                const space = ancestors.find(isSpace);
                const collection =
                  ancestors.findLast((ancestor) => ancestor instanceof CollectionType) ??
                  space?.properties[CollectionType.typename];
                if (!space || !collection) {
                  return;
                }

                const result = await dispatch({
                  plugin: SPACE_PLUGIN,
                  action: SpaceAction.ADD_OBJECT,
                  data: {
                    target: collection,
                    object: create(CollectionType, { name: data.name, objects: [], views: {} }),
                  },
                });

                return result?.data.object;
              },
            },
          ];
        },
      },
      intent: {
        resolver: async (intent, plugins) => {
          const clientPlugin = resolvePlugin(plugins, parseClientPlugin);
          const client = clientPlugin?.provides.client;
          switch (intent.action) {
            case SpaceAction.WAIT_FOR_OBJECT: {
              state.values.awaiting = intent.data?.id;
              return { data: true };
            }

            case SpaceAction.CREATE: {
              if (!client) {
                return;
              }

              const space = await client.spaces.create(intent.data as PropertiesTypeProps);
              await space.waitUntilReady();
              const collection = create(CollectionType, { objects: [], views: {} });
              space.properties[CollectionType.typename] = collection;

              if (Migrations.versionProperty) {
                space.properties[Migrations.versionProperty] = Migrations.targetVersion;
              }

              return {
                data: {
                  space,
                  id: space.id,
                  activeParts: { main: [space.id] },
                },
                intents: [
                  ...(settings.values.onSpaceCreate
                    ? [
                        [
                          { action: settings.values.onSpaceCreate, data: { space } },
                          { action: SpaceAction.ADD_OBJECT, data: { target: space } },
                          { action: NavigationAction.EXPOSE },
                        ],
                      ]
                    : []),
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
                const { space } = await client.shell.joinSpace({ invitationCode: intent.data?.invitationCode });
                if (space) {
                  return {
                    data: {
                      space,
                      id: space.id,
                      activeParts: { main: [space.id] },
                    },
                    intents: [
                      [
                        {
                          action: LayoutAction.SET_LAYOUT,
                          data: {
                            element: 'toast',
                            subject: {
                              id: `${SPACE_PLUGIN}/join-success`,
                              duration: 10_000,
                              title: translations[0]['en-US'][SPACE_PLUGIN]['join success label'],
                              closeLabel: translations[0]['en-US'][SPACE_PLUGIN]['dismiss label'],
                            },
                          },
                        },
                      ],
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
                if (!navigationPlugin?.provides.location.active) {
                  return;
                }
                const target = firstIdInPart(navigationPlugin?.provides.location.active, 'main');
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
                            members: result.members?.length,
                            error: result.error?.message,
                            cancelled: result.cancelled,
                          },
                        },
                      },
                    ],
                  ],
                };
              }
              break;
            }

            case SpaceAction.LOCK: {
              const space = intent.data?.space;
              if (isSpace(space)) {
                space.properties[COMPOSER_SPACE_LOCK] = true;
                return {
                  data: true,
                  intents: [
                    [
                      {
                        action: ObservabilityAction.SEND_EVENT,
                        data: {
                          name: 'space.lock',
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

            case SpaceAction.UNLOCK: {
              const space = intent.data?.space;
              if (isSpace(space)) {
                space.properties[COMPOSER_SPACE_LOCK] = false;
                return {
                  data: true,
                  intents: [
                    [
                      {
                        action: ObservabilityAction.SEND_EVENT,
                        data: {
                          name: 'space.unlock',
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
                if (space.state.get() === SpaceState.SPACE_REQUIRES_MIGRATION) {
                  state.values.sdkMigrationRunning[space.id] = true;
                  await space.internal.migrate();
                  state.values.sdkMigrationRunning[space.id] = false;
                }
                const result = await Migrations.migrate(space, intent.data?.version);
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

            case SpaceAction.ADD_OBJECT: {
              const object = intent.data?.object ?? intent.data?.result;
              if (!isReactiveObject(object)) {
                return;
              }

              const space = isSpace(intent.data?.target) ? intent.data?.target : getSpace(intent.data?.target);
              if (!space) {
                return;
              }

              if (space.db.coreDatabase.getAllObjectIds().length >= SPACE_MAX_OBJECTS) {
                return {
                  data: false,
                  intents: [
                    [
                      {
                        action: LayoutAction.SET_LAYOUT,
                        data: {
                          element: 'toast',
                          subject: {
                            id: `${SPACE_PLUGIN}/space-limit`,
                            title: translations[0]['en-US'][SPACE_PLUGIN]['space limit label'],
                            description: translations[0]['en-US'][SPACE_PLUGIN]['space limit description'],
                            duration: 5_000,
                            icon: 'ph--warning--regular',
                            actionLabel: translations[0]['en-US'][SPACE_PLUGIN]['remove deleted objects label'],
                            actionAlt: translations[0]['en-US'][SPACE_PLUGIN]['remove deleted objects alt'],
                            // TODO(wittjosiah): Use OS namespace.
                            closeLabel: translations[0]['en-US'][SPACE_PLUGIN]['space limit close label'],
                            onAction: () => space.db.coreDatabase.unlinkDeletedObjects(),
                          },
                        },
                      },
                    ],
                    [
                      {
                        action: ObservabilityAction.SEND_EVENT,
                        data: {
                          name: 'space.limit',
                          properties: {
                            spaceId: space.id,
                          },
                        },
                      },
                    ],
                  ],
                };
              }

              if (intent.data?.target instanceof CollectionType) {
                intent.data?.target.objects.push(object as HasId);
              } else if (isSpace(intent.data?.target)) {
                const collection = space.properties[CollectionType.typename];
                if (collection instanceof CollectionType) {
                  collection.objects.push(object as HasId);
                } else {
                  // TODO(wittjosiah): Can't add non-echo objects by including in a collection because of types.
                  const collection = create(CollectionType, { objects: [object as HasId], views: {} });
                  space.properties[CollectionType.typename] = collection;
                }
              }

              return {
                data: { id: fullyQualifiedId(object), object, activeParts: { main: [fullyQualifiedId(object)] } },
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

            case SpaceAction.REMOVE_OBJECT: {
              const object = intent.data?.object ?? intent.data?.result;
              const space = getSpace(object);
              if (!(isEchoObject(object) && space)) {
                return;
              }

              const resolve = resolvePlugin(plugins, parseMetadataResolverPlugin)?.provides.metadata.resolver;
              const activeParts = navigationPlugin?.provides.location.active;
              const openObjectIds = new Set<string>(openIds(activeParts ?? {}));

              if (!intent.undo && resolve) {
                // Capture the current state for undo.
                const parentCollection = intent.data?.collection ?? space.properties[CollectionType.typename];
                const nestedObjects = await getNestedObjects(object, resolve);
                const deletionData = {
                  object,
                  parentCollection,
                  index:
                    parentCollection instanceof CollectionType
                      ? parentCollection.objects.indexOf(object as Expando)
                      : -1,
                  nestedObjects,
                  wasActive: [object, ...nestedObjects]
                    .map((obj) => fullyQualifiedId(obj))
                    .filter((id) => openObjectIds.has(id)),
                };

                // If the item is active, navigate to "nowhere" to avoid navigating to a removed item.
                if (deletionData.wasActive.length > 0) {
                  await intentPlugin?.provides.intent.dispatch({
                    action: NavigationAction.CLOSE,
                    data: {
                      activeParts: {
                        main: deletionData.wasActive,
                        sidebar: deletionData.wasActive,
                      },
                    },
                  });
                }

                if (parentCollection instanceof CollectionType) {
                  // TODO(Zan): Is there a nicer way to do this without casting to Expando?
                  const index = parentCollection.objects.indexOf(object as Expando);
                  if (index !== -1) {
                    parentCollection.objects.splice(index, 1);
                  }
                }

                // If the object is a collection, also delete its nested objects.
                deletionData.nestedObjects.forEach((obj) => {
                  space.db.remove(obj);
                });
                space.db.remove(object);

                const undoMessageKey =
                  object instanceof CollectionType ? 'collection deleted label' : 'object deleted label';

                return {
                  data: true,
                  undoable: {
                    // Consider using a translation key here.
                    message: translations[0]['en-US'][SPACE_PLUGIN][undoMessageKey],
                    data: deletionData,
                  },
                };
              } else {
                const undoData = intent.data;
                if (undoData && isEchoObject(undoData.object) && undoData.parentCollection instanceof CollectionType) {
                  // Restore the object to the space.
                  const restoredObject = space.db.add(undoData.object);

                  // Restore nested objects if the object was a collection.
                  undoData.nestedObjects.forEach((obj: Expando) => {
                    space.db.add(obj);
                  });

                  // Restore the object to its original position in the collection.
                  if (undoData.index !== -1) {
                    undoData.parentCollection.objects.splice(undoData.index, 0, restoredObject as Expando);
                  }

                  // Restore active state if it was active before removal.
                  if (undoData.wasActive.length > 0) {
                    await intentPlugin?.provides.intent.dispatch({
                      action: NavigationAction.OPEN,
                      data: { activeParts: { main: undoData.wasActive } },
                    });
                  }

                  return { data: true };
                }

                return { data: false };
              }
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
              const resolve = resolvePlugin(plugins, parseMetadataResolverPlugin)?.provides.metadata.resolver;
              if (!isEchoObject(originalObject) || !resolve) {
                return;
              }

              const newObject = await cloneObject(originalObject, resolve);
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

//
// Copyright 2024 DXOS.org
//

import { signal } from '@preact/signals-core';
import React from 'react';

import {
  type GraphProvides,
  type IntentDispatcher,
  type IntentPluginProvides,
  LayoutAction,
  type LayoutProvides,
  type LocationProvides,
  type MetadataResolverProvides,
  NavigationAction,
  type Plugin,
  type PluginDefinition,
  Surface,
  filterPlugins,
  findPlugin,
  firstIdInPart,
  openIds,
  parseGraphPlugin,
  parseIntentPlugin,
  parseLayoutPlugin,
  parseMetadataResolverPlugin,
  parseNavigationPlugin,
  resolvePlugin,
} from '@dxos/app-framework';
import { EventSubscriptions, type Trigger, type UnsubscribeCallback } from '@dxos/async';
import { S, type AbstractTypedObject, type HasId } from '@dxos/echo-schema';
import { scheduledEffect } from '@dxos/echo-signals/core';
import { invariant } from '@dxos/invariant';
import { create, isDeleted, isReactiveObject, makeRef } from '@dxos/live-object';
import { LocalStorageStore } from '@dxos/local-storage';
import { log } from '@dxos/log';
import { Migrations } from '@dxos/migrations';
import { type AttentionPluginProvides, parseAttentionPlugin } from '@dxos/plugin-attention';
import { type ClientPluginProvides, parseClientPlugin } from '@dxos/plugin-client';
import { type Node, createExtension, memoize, toSignal } from '@dxos/plugin-graph';
import { ObservabilityAction } from '@dxos/plugin-observability/meta';
import { EdgeReplicationSetting } from '@dxos/protocols/proto/dxos/echo/metadata';
import { type Client, PublicKey } from '@dxos/react-client';
import {
  Expando,
  FQ_ID_LENGTH,
  Filter,
  OBJECT_ID_LENGTH,
  type ReactiveEchoObject,
  SPACE_ID_LENGTH,
  type Space,
  SpaceState,
  fullyQualifiedId,
  getSpace,
  getTypename,
  isEchoObject,
  isSpace,
  loadObjectReferences,
  parseFullyQualifiedId,
  parseId,
} from '@dxos/react-client/echo';
import { type JoinPanelProps, osTranslations } from '@dxos/shell/react';
import { ComplexMap, nonNullable, reduceGroupBy } from '@dxos/util';

import {
  AwaitingObject,
  CollectionMain,
  CollectionSection,
  CreateObjectDialog,
  type CreateObjectDialogProps,
  CreateSpaceDialog,
  DefaultObjectSettings,
  JoinDialog,
  InlineSyncStatus,
  MenuFooter,
  PopoverRenameObject,
  PopoverRenameSpace,
  ShareSpaceButton,
  SmallPresence,
  SmallPresenceLive,
  SpacePluginSettings,
  SpacePresence,
  SpaceSettingsDialog,
  SpaceSettingsPanel,
  SyncStatus,
  type SpaceSettingsDialogProps,
} from './components';
import meta, { CollectionAction, SPACE_PLUGIN, SpaceAction } from './meta';
import translations from './translations';
import {
  CollectionType,
  parseSchemaPlugin,
  SpaceForm,
  type PluginState,
  type SpacePluginProvides,
  type SpaceSettingsProps,
} from './types';
import {
  COMPOSER_SPACE_LOCK,
  SHARED,
  SPACES,
  SPACE_TYPE,
  cloneObject,
  constructObjectActions,
  constructSpaceActions,
  constructSpaceNode,
  createObjectNode,
  getNestedObjects,
  memoizeQuery,
} from './util';

const ACTIVE_NODE_BROADCAST_INTERVAL = 30_000;
const WAIT_FOR_OBJECT_TIMEOUT = 1000;
const SPACE_MAX_OBJECTS = 500;
// https://stackoverflow.com/a/19016910
const DIRECTORY_TYPE = 'text/directory';

export const parseSpacePlugin = (plugin?: Plugin) =>
  Array.isArray((plugin?.provides as any).space?.enabled) ? (plugin as Plugin<SpacePluginProvides>) : undefined;

export type SpacePluginOptions = {
  /**
   * Base URL for the invitation link.
   */
  invitationUrl?: string;

  /**
   * Query parameter for the invitation code.
   */
  invitationParam?: string;

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
  invitationUrl = window.location.origin,
  invitationParam = 'spaceInvitationCode',
  firstRun,
  onFirstRun,
}: SpacePluginOptions = {}): PluginDefinition<SpacePluginProvides> => {
  const settings = new LocalStorageStore<SpaceSettingsProps>(SPACE_PLUGIN, {});
  const state = new LocalStorageStore<PluginState>(SPACE_PLUGIN, {
    awaiting: undefined,
    spaceNames: {},
    viewersByObject: {},
    // TODO(wittjosiah): Stop using (Complex)Map inside reactive object.
    viewersByIdentity: new ComplexMap(PublicKey.hash),
    sdkMigrationRunning: {},
    navigableCollections: false,
    enabledEdgeReplication: false,
  });
  const subscriptions = new EventSubscriptions();
  const spaceSubscriptions = new EventSubscriptions();
  const graphSubscriptions = new Map<string, UnsubscribeCallback>();
  const schemas: AbstractTypedObject[] = [];

  let clientPlugin: Plugin<ClientPluginProvides> | undefined;
  let graphPlugin: Plugin<GraphProvides> | undefined;
  let intentPlugin: Plugin<IntentPluginProvides> | undefined;
  let layoutPlugin: Plugin<LayoutProvides> | undefined;
  let navigationPlugin: Plugin<LocationProvides> | undefined;
  let attentionPlugin: Plugin<AttentionPluginProvides> | undefined;
  let metadataPlugin: Plugin<MetadataResolverProvides> | undefined;

  const createSpaceInvitationUrl = (invitationCode: string) => {
    const baseUrl = new URL(invitationUrl);
    baseUrl.searchParams.set(invitationParam, invitationCode);
    return baseUrl.toString();
  };

  const onSpaceReady = async () => {
    if (!clientPlugin || !intentPlugin || !graphPlugin || !navigationPlugin || !layoutPlugin || !attentionPlugin) {
      return;
    }

    const client = clientPlugin.provides.client;
    const dispatch = intentPlugin.provides.intent.dispatch;
    const graph = graphPlugin.provides.graph;
    const location = navigationPlugin.provides.location;
    const layout = layoutPlugin.provides.layout;
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

    // Await missing objects.
    subscriptions.add(
      scheduledEffect(
        () => ({
          layoutMode: layout.layoutMode,
          soloPart: location.active.solo?.[0],
        }),
        ({ layoutMode, soloPart }) => {
          if (layoutMode !== 'solo' || !soloPart) {
            return;
          }

          const node = graph.findNode(soloPart.id);
          if (!node && soloPart.id.length === FQ_ID_LENGTH) {
            const timeout = setTimeout(async () => {
              const node = graph.findNode(soloPart.id);
              if (!node) {
                await dispatch({
                  plugin: SPACE_PLUGIN,
                  action: SpaceAction.WAIT_FOR_OBJECT,
                  data: { id: soloPart.id },
                });
              }
            }, WAIT_FOR_OBJECT_TIMEOUT);

            return () => clearTimeout(timeout);
          }
        },
      ),
    );

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
          open: openIds(location.active, layout.layoutMode === 'solo' ? ['solo'] : ['main']),
          closed: [...location.closed],
        }),
        ({ open, closed }) => {
          const send = () => {
            const spaces = client.spaces.get();
            const identity = client.halo.identity.get();
            if (identity && location.active) {
              // Group parts by space for efficient messaging.
              const idsBySpace = reduceGroupBy(open, (id) => {
                try {
                  const [spaceId] = parseFullyQualifiedId(id);
                  return spaceId;
                } catch {
                  return null;
                }
              });

              const removedBySpace = reduceGroupBy(closed, (id) => {
                try {
                  const [spaceId] = parseFullyQualifiedId(id);
                  return spaceId;
                } catch {
                  return null;
                }
              });

              // NOTE: Ensure all spaces are included so that we send the correct `removed` object arrays.
              for (const space of spaces) {
                if (!idsBySpace.has(space.id)) {
                  idsBySpace.set(space.id, []);
                }
              }

              for (const [spaceId, added] of idsBySpace) {
                const removed = removedBySpace.get(spaceId) ?? [];
                const space = spaces.find((space) => space.id === spaceId);
                if (!space) {
                  continue;
                }

                void space
                  .postMessage('viewing', {
                    identityKey: identity.identityKey.toHex(),
                    attended: attention.attended ? [...attention.attended] : [],
                    added,
                    removed,
                  })
                  // TODO(burdon): This seems defensive; why would this fail? Backoff interval.
                  .catch((err) => {
                    log.warn('Failed to broadcast active node for presence.', { err: err.message });
                  });
              }
            }
          };

          send();
          // Send at interval to allow peers to expire entries if they become disconnected.
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
              const currentIdentity = client.halo.identity.get();
              if (
                identityKey &&
                !currentIdentity?.identityKey.equals(identityKey) &&
                Array.isArray(added) &&
                Array.isArray(removed)
              ) {
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

  const setEdgeReplicationDefault = async (client: Client) => {
    try {
      await Promise.all(
        client.spaces.get().map((space) => space.internal.setEdgeReplicationPreference(EdgeReplicationSetting.ENABLED)),
      );
      state.values.enabledEdgeReplication = true;
    } catch (err) {
      log.catch(err);
    }
  };

  return {
    meta,
    ready: async (plugins) => {
      settings.prop({ key: 'showHidden', type: LocalStorageStore.bool({ allowUndefined: true }) });
      state
        .prop({ key: 'spaceNames', type: LocalStorageStore.json<Record<string, string>>() })
        .prop({ key: 'enabledEdgeReplication', type: LocalStorageStore.bool() });

      // TODO(wittjosiah): Hardcoded due to circular dependency.
      //   Should be based on a provides interface.
      if (findPlugin(plugins, 'dxos.org/plugin/stack')) {
        state.values.navigableCollections = true;
      }

      graphPlugin = resolvePlugin(plugins, parseGraphPlugin);
      layoutPlugin = resolvePlugin(plugins, parseLayoutPlugin);
      metadataPlugin = resolvePlugin(plugins, parseMetadataResolverPlugin);
      navigationPlugin = resolvePlugin(plugins, parseNavigationPlugin);
      attentionPlugin = resolvePlugin(plugins, parseAttentionPlugin);
      clientPlugin = resolvePlugin(plugins, parseClientPlugin);
      intentPlugin = resolvePlugin(plugins, parseIntentPlugin);
      if (!clientPlugin || !intentPlugin) {
        return;
      }

      const client = clientPlugin.provides.client;
      const dispatch = intentPlugin.provides.intent.dispatch;

      schemas.push(
        ...filterPlugins(plugins, parseSchemaPlugin)
          .map((plugin) => plugin.provides.echo.schema)
          .filter(nonNullable)
          .reduce((acc, schema) => {
            return [...acc, ...schema];
          }),
      );
      client.addTypes(schemas);
      filterPlugins(plugins, parseSchemaPlugin).forEach((plugin) => {
        if (plugin.provides.echo.system) {
          client.addTypes(plugin.provides.echo.system);
        }
      });

      const handleFirstRun = async () => {
        const defaultSpace = client.spaces.default;

        // Create root collection structure.
        defaultSpace.properties[CollectionType.typename] = create(CollectionType, { objects: [], views: {} });
        if (Migrations.versionProperty) {
          defaultSpace.properties[Migrations.versionProperty] = Migrations.targetVersion;
        }
        await onFirstRun?.({ client, dispatch });
      };

      subscriptions.add(
        client.spaces.isReady.subscribe(async (ready) => {
          if (ready) {
            await clientPlugin?.provides.client.spaces.default.waitUntilReady();
            if (firstRun) {
              void firstRun?.wait().then(handleFirstRun);
            } else {
              await handleFirstRun();
            }

            await onSpaceReady();
            await setEdgeReplicationDefault(client);
          }
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
      space: state.values,
      settings: settings.values,
      translations: [...translations, osTranslations],
      complementary: {
        panels: [
          { id: 'settings', label: ['open settings panel label', { ns: SPACE_PLUGIN }], icon: 'ph--gear--regular' },
        ],
      },
      root: () => (state.values.awaiting ? <AwaitingObject id={state.values.awaiting} /> : null),
      metadata: {
        records: {
          [CollectionType.typename]: {
            createObject: CollectionAction.CREATE,
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
          switch (role) {
            case 'article':
              // TODO(wittjosiah): Need to avoid shotgun parsing space state everywhere.
              return isSpace(data.object) && data.object.state.get() === SpaceState.SPACE_READY ? (
                <Surface
                  data={{ object: data.object.properties[CollectionType.typename], id: data.object.id }}
                  role={role}
                  {...rest}
                />
              ) : data.object instanceof CollectionType ? (
                {
                  node: <CollectionMain collection={data.object} />,
                  disposition: 'fallback',
                }
              ) : null;
            // TODO(burdon): Add role name syntax to minimal plugin docs.
            case 'complementary--settings':
              return isSpace(data.subject) ? (
                <SpaceSettingsPanel space={data.subject} />
              ) : isEchoObject(data.subject) ? (
                { node: <DefaultObjectSettings object={data.subject} />, disposition: 'fallback' }
              ) : null;
            case 'dialog':
              if (data.component === 'dxos.org/plugin/space/SpaceSettingsDialog') {
                return (
                  <SpaceSettingsDialog
                    {...(data.subject as SpaceSettingsDialogProps)}
                    createInvitationUrl={createSpaceInvitationUrl}
                  />
                );
              } else if (data.component === 'dxos.org/plugin/space/JoinDialog') {
                return <JoinDialog {...(data.subject as JoinPanelProps)} />;
              } else if (data.component === 'dxos.org/plugin/space/CreateSpaceDialog') {
                return <CreateSpaceDialog />;
              } else if (data.component === 'dxos.org/plugin/space/CreateObjectDialog') {
                return (
                  <CreateObjectDialog
                    {...(data.subject as CreateObjectDialogProps)}
                    schemas={schemas}
                    navigableCollections={state.values.navigableCollections}
                    resolve={metadataPlugin?.provides.metadata.resolver}
                  />
                );
              }
              return null;
            case 'popover': {
              if (data.component === 'dxos.org/plugin/space/RenameSpacePopover' && isSpace(data.subject)) {
                return <PopoverRenameSpace space={data.subject} />;
              }
              if (data.component === 'dxos.org/plugin/space/RenameObjectPopover' && isReactiveObject(data.subject)) {
                return <PopoverRenameObject object={data.subject} />;
              }
              return null;
            }
            case 'navtree-item-end': {
              return isReactiveObject(data.object) ? (
                <SmallPresenceLive
                  id={data.id as string}
                  viewers={state.values.viewersByObject[fullyQualifiedId(data.object)]}
                />
              ) : isSpace(data.object) ? (
                <InlineSyncStatus space={data.object} />
              ) : (
                // TODO(wittjosiah): Attention glyph for non-echo items should be handled elsewhere.
                <SmallPresence id={data.id as string} count={0} />
              );
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
                        {space.properties[COMPOSER_SPACE_LOCK] ? null : <ShareSpaceButton space={space} />}
                      </>
                    ),
                    disposition: 'hoist',
                  }
                : null;
            }
            case 'section':
              return data.object instanceof CollectionType ? <CollectionSection collection={data.object} /> : null;
            case 'settings':
              return data.plugin === meta.id ? <SpacePluginSettings settings={settings.values} /> : null;
            case 'menu-footer':
              if (isEchoObject(data.object)) {
                return <MenuFooter object={data.object} />;
              } else {
                return null;
              }
            case 'status': {
              return <SyncStatus />;
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
          if (!client || !dispatch || !resolve || !graph) {
            return [];
          }

          const spacesNode = {
            id: SPACES,
            type: SPACES,
            cacheable: ['label', 'role'],
            properties: {
              label: ['spaces label', { ns: SPACE_PLUGIN }],
              testId: 'spacePlugin.spaces',
              role: 'branch',
              disabled: true,
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
          };

          return [
            // Create spaces group node.
            createExtension({
              id: `${SPACE_PLUGIN}/root`,
              filter: (node): node is Node<null> => node.id === 'root',
              connector: () => [spacesNode],
              resolver: ({ id }) => (id === SPACES ? spacesNode : undefined),
            }),

            // Create space nodes.
            createExtension({
              id: SPACES,
              filter: (node): node is Node<null> => node.id === SPACES,
              actions: () => [
                {
                  id: SpaceAction.OPEN_CREATE_SPACE,
                  data: async () => {
                    await dispatch({
                      plugin: SPACE_PLUGIN,
                      action: SpaceAction.OPEN_CREATE_SPACE,
                    });
                  },
                  properties: {
                    label: ['create space label', { ns: SPACE_PLUGIN }],
                    icon: 'ph--plus--regular',
                    testId: 'spacePlugin.createSpace',
                    disposition: 'item',
                    className: 'border-t border-separator',
                  },
                },
                {
                  id: SpaceAction.JOIN,
                  data: async () => {
                    await dispatch({
                      plugin: SPACE_PLUGIN,
                      action: SpaceAction.JOIN,
                    });
                  },
                  properties: {
                    label: ['join space label', { ns: SPACE_PLUGIN }],
                    icon: 'ph--sign-in--regular',
                    testId: 'spacePlugin.joinSpace',
                    disposition: 'item',
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

                // TODO(wittjosiah): During client reset, accessing default space throws.
                try {
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
                        navigable: state.values.navigableCollections,
                        personal: space === client.spaces.default,
                        namesCache: state.values.spaceNames,
                        resolve,
                      }),
                    );
                } catch {}
              },
              resolver: ({ id }) => {
                if (id.length !== SPACE_ID_LENGTH) {
                  return;
                }

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

                const space = spaces.find((space) => space.id === id);
                if (!space) {
                  return;
                }

                if (space.state.get() === SpaceState.SPACE_INACTIVE) {
                  return false;
                } else {
                  return constructSpaceNode({
                    space,
                    navigable: state.values.navigableCollections,
                    personal: space === client.spaces.default,
                    namesCache: state.values.spaceNames,
                    resolve,
                  });
                }
              },
            }),

            // Create space actions.
            createExtension({
              id: `${SPACE_PLUGIN}/actions`,
              filter: (node): node is Node<Space> => isSpace(node.data),
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
                const spaceState = toSignal(
                  (onChange) => space.state.subscribe(() => onChange()).unsubscribe,
                  () => space.state.get(),
                  space.id,
                );
                if (spaceState !== SpaceState.SPACE_READY) {
                  return;
                }

                const collection = space.properties[CollectionType.typename] as CollectionType | undefined;
                if (!collection) {
                  return;
                }

                return collection.objects
                  .map(object => object.target)
                  .filter(nonNullable)
                  .map((object) =>
                    createObjectNode({ object, space, resolve, navigable: state.values.navigableCollections }),
                  )
                  .filter(nonNullable);
              },
            }),

            // Create nodes for objects in a collection or by its fully qualified id.
            createExtension({
              id: `${SPACE_PLUGIN}/objects`,
              filter: (node): node is Node<CollectionType> => node.data instanceof CollectionType,
              connector: ({ node }) => {
                const collection = node.data;
                const space = getSpace(collection);
                if (!space) {
                  return;
                }

                return collection.objects
                  .map(object => object.target)
                  .filter(nonNullable)
                  .map((object) =>
                    createObjectNode({ object, space, resolve, navigable: state.values.navigableCollections }),
                  )
                  .filter(nonNullable);
              },
              resolver: ({ id }) => {
                if (id.length !== FQ_ID_LENGTH) {
                  return;
                }

                const [spaceId, objectId] = id.split(':');
                if (spaceId.length !== SPACE_ID_LENGTH && objectId.length !== OBJECT_ID_LENGTH) {
                  return;
                }

                const space = client.spaces.get().find((space) => space.id === spaceId);
                if (!space) {
                  return;
                }

                const spaceState = toSignal(
                  (onChange) => space.state.subscribe(() => onChange()).unsubscribe,
                  () => space.state.get(),
                  space.id,
                );
                if (spaceState !== SpaceState.SPACE_READY) {
                  return;
                }

                const store = memoize(() => signal(space.db.getObjectById(objectId)), id);
                memoize(() => {
                  if (!store.value) {
                    void space.db
                      .query({ id: objectId })
                      .first()
                      .then((o) => (store.value = o))
                      .catch((err) => log.catch(err, { objectId }));
                  }
                }, id);
                const object = store.value;
                if (!object) {
                  return;
                }

                if (isDeleted(object)) {
                  return false;
                } else {
                  return createObjectNode({ object, space, resolve, navigable: state.values.navigableCollections });
                }
              },
            }),

            // Create collection actions and action groups.
            createExtension({
              id: `${SPACE_PLUGIN}/object-actions`,
              filter: (node): node is Node<ReactiveEchoObject<any>> => isEchoObject(node.data),
              actions: ({ node }) => constructObjectActions({ node, dispatch }),
            }),

            // Create nodes for object settings.
            createExtension({
              id: `${SPACE_PLUGIN}/settings-for-subject`,
              resolver: ({ id }) => {
                // TODO(Zan): Find util (or make one).
                if (!id.endsWith('~settings')) {
                  return;
                }

                const type = 'orphan-settings-for-subject';
                const icon = 'ph--gear--regular';

                const [subjectId] = id.split('~');
                const { spaceId, objectId } = parseId(subjectId);
                const spaces = toSignal(
                  (onChange) => client.spaces.subscribe(() => onChange()).unsubscribe,
                  () => client.spaces.get(),
                );
                const space = spaces?.find(
                  (space) => space.id === spaceId && space.state.get() === SpaceState.SPACE_READY,
                );
                if (!objectId) {
                  const label = space
                    ? space.properties.name || ['unnamed space label', { ns: SPACE_PLUGIN }]
                    : ['unnamed object settings label', { ns: SPACE_PLUGIN }];

                  // TODO(wittjosiah): Support comments for arbitrary subjects.
                  //   This is to ensure that the comments panel is not stuck on an old object.
                  return {
                    id,
                    type,
                    data: null,
                    properties: {
                      icon,
                      label,
                      showResolvedThreads: false,
                      object: null,
                      space,
                    },
                  };
                }

                const [object] = memoizeQuery(space, { id: objectId });
                if (!object || !subjectId) {
                  return;
                }

                const meta = resolve(getTypename(object) ?? '');
                const label = meta.label?.(object) ||
                  object.name ||
                  meta.placeholder || ['unnamed object settings label', { ns: SPACE_PLUGIN }];

                return {
                  id,
                  type,
                  data: null,
                  properties: {
                    icon,
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

            case SpaceAction.OPEN_CREATE_SPACE: {
              return {
                data: true,
                intents: [
                  [
                    {
                      action: LayoutAction.SET_LAYOUT,
                      data: {
                        element: 'dialog',
                        component: 'dxos.org/plugin/space/CreateSpaceDialog',
                        dialogBlockAlign: 'start',
                        subject: intent.data,
                      },
                    },
                  ],
                ],
              };
            }

            case SpaceAction.CREATE: {
              if (!client || !S.is(SpaceForm)(intent.data)) {
                return;
              }

              const space = await client.spaces.create({ name: intent.data.name });
              if (intent.data.edgeReplication) {
                await space.internal.setEdgeReplicationPreference(EdgeReplicationSetting.ENABLED);
              }
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
              return {
                data: true,
                intents: [
                  [
                    {
                      action: LayoutAction.SET_LAYOUT,
                      data: {
                        element: 'dialog',
                        component: 'dxos.org/plugin/space/JoinDialog',
                        dialogBlockAlign: 'start',
                        subject: {
                          initialInvitationCode: intent.data?.invitationCode,
                        } satisfies Partial<JoinPanelProps>,
                      },
                    },
                  ],
                ],
              };
            }

            case SpaceAction.SHARE: {
              const space = intent.data?.space;
              if (isSpace(space) && !space.properties[COMPOSER_SPACE_LOCK]) {
                const active = navigationPlugin?.provides.location.active;
                const mode = layoutPlugin?.provides.layout.layoutMode;
                const current = active ? firstIdInPart(active, mode === 'solo' ? 'solo' : 'main') : undefined;
                const target = current?.startsWith(space.id) ? current : undefined;

                return {
                  data: true,
                  intents: [
                    [
                      {
                        action: LayoutAction.SET_LAYOUT,
                        data: {
                          element: 'dialog',
                          component: 'dxos.org/plugin/space/SpaceSettingsDialog',
                          dialogBlockAlign: 'start',
                          subject: {
                            space,
                            target,
                            initialTab: 'members',
                            createInvitationUrl: createSpaceInvitationUrl,
                          } satisfies Partial<SpaceSettingsDialogProps>,
                        },
                      },
                    ],
                    [
                      {
                        action: ObservabilityAction.SEND_EVENT,
                        data: {
                          name: 'space.share',
                          properties: {
                            space: space.id,
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

            case SpaceAction.OPEN_SETTINGS: {
              const space = intent.data?.space;
              if (isSpace(space)) {
                return {
                  data: true,
                  intents: [
                    [
                      {
                        action: LayoutAction.SET_LAYOUT,
                        data: {
                          element: 'dialog',
                          component: 'dxos.org/plugin/space/SpaceSettingsDialog',
                          dialogBlockAlign: 'start',
                          subject: {
                            space,
                            initialTab: 'settings',
                            createInvitationUrl: createSpaceInvitationUrl,
                          } satisfies Partial<SpaceSettingsDialogProps>,
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

            case SpaceAction.OPEN_CREATE_OBJECT: {
              return {
                data: true,
                intents: [
                  [
                    {
                      action: LayoutAction.SET_LAYOUT,
                      data: {
                        element: 'dialog',
                        component: 'dxos.org/plugin/space/CreateObjectDialog',
                        dialogBlockAlign: 'start',
                        subject: intent.data,
                      },
                    },
                  ],
                ],
              };
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
                intent.data?.target.objects.push(makeRef(object as HasId));
              } else if (isSpace(intent.data?.target)) {
                const collection = space.properties[CollectionType.typename];
                if (collection instanceof CollectionType) {
                  collection.objects.push(makeRef(object as HasId));
                } else {
                  // TODO(wittjosiah): Can't add non-echo objects by including in a collection because of types.
                  const collection = create(CollectionType, { objects: [makeRef(object as HasId)], views: {} });
                  space.properties[CollectionType.typename] = makeRef(collection);
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

            case SpaceAction.REMOVE_OBJECTS: {
              const objects = intent.data?.objects ?? intent.data?.result;
              invariant(Array.isArray(objects));

              // All objects must be a member of the same space.
              const space = getSpace(objects[0]);
              if (!space || !objects.every((obj) => isEchoObject(obj) && getSpace(obj) === space)) {
                return;
              }

              const resolve = resolvePlugin(plugins, parseMetadataResolverPlugin)?.provides.metadata.resolver;
              const activeParts = navigationPlugin?.provides.location.active;
              const openObjectIds = new Set<string>(openIds(activeParts ?? {}));

              if (!intent.undo && resolve) {
                const parentCollection = intent.data?.collection ?? space.properties[CollectionType.typename];
                const nestedObjectsList = await Promise.all(objects.map((obj) => getNestedObjects(obj, resolve)));

                const deletionData = {
                  objects,
                  parentCollection,
                  indices: objects.map((obj) =>
                    parentCollection instanceof CollectionType ? parentCollection.objects.findIndex(object => object.target === obj) : -1,
                  ),
                  nestedObjectsList,
                  wasActive: objects
                    .flatMap((obj, i) => [obj, ...nestedObjectsList[i]])
                    .map((obj) => fullyQualifiedId(obj))
                    .filter((id) => openObjectIds.has(id)),
                };

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

                if (deletionData.parentCollection instanceof CollectionType) {
                  [...deletionData.indices]
                    .sort((a, b) => b - a)
                    .forEach((index: number) => {
                      if (index !== -1) {
                        deletionData.parentCollection.objects.splice(index, 1);
                      }
                    });
                }

                deletionData.nestedObjectsList.flat().forEach((obj) => {
                  space.db.remove(obj);
                });
                objects.forEach((obj) => space.db.remove(obj));

                const undoMessageKey = objects.some((obj) => obj instanceof CollectionType)
                  ? 'collection deleted label'
                  : objects.length > 1
                    ? 'objects deleted label'
                    : 'object deleted label';

                return {
                  data: true,
                  undoable: {
                    // TODO(ZaymonFC): Pluralize if more than one object.
                    message: translations[0]['en-US'][SPACE_PLUGIN][undoMessageKey],
                    data: deletionData,
                  },
                };
              } else {
                const undoData = intent.data;
                if (
                  undoData?.objects?.length &&
                  undoData.objects.every(isEchoObject) &&
                  undoData.parentCollection instanceof CollectionType
                ) {
                  // Restore the object to the space.
                  const restoredObjects = undoData.objects.map((obj: Expando) => space.db.add(obj));

                  // Restore nested objects to the space.
                  undoData.nestedObjectsList.flat().forEach((obj: Expando) => {
                    space.db.add(obj);
                  });

                  undoData.indices.forEach((index: number, i: number) => {
                    if (index !== -1) {
                      undoData.parentCollection.objects.splice(index, 0, restoredObjects[i] as Expando);
                    }
                  });

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
              const space = isSpace(intent.data?.target) ? intent.data?.target : getSpace(intent.data?.target);
              if (!isEchoObject(originalObject) || !resolve || !space) {
                return;
              }

              const newObject = await cloneObject(originalObject, resolve, space);
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

            case CollectionAction.CREATE: {
              const collection = create(CollectionType, {
                name: intent.data?.name,
                objects: [],
                views: {},
              });

              return { data: collection };
            }
          }
        },
      },
    },
  };
};

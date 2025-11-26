//
// Copyright 2025 DXOS.org
//

import { Atom } from '@effect-atom/atom-react';
import * as Array from 'effect/Array';
import * as Function from 'effect/Function';
import * as Option from 'effect/Option';
import * as Schema from 'effect/Schema';

import { Capabilities, type PluginContext, contributes, createIntent } from '@dxos/app-framework';
import { type Space, SpaceState, getSpace, isSpace } from '@dxos/client/echo';
import { DXN, type Database, type Entity, Filter, Obj, Type } from '@dxos/echo';
import { log } from '@dxos/log';
import { ClientCapabilities } from '@dxos/plugin-client';
import { ATTENDABLE_PATH_SEPARATOR, PLANK_COMPANION_TYPE } from '@dxos/plugin-deck/types';
import { ROOT_ID, atomFromObservable, atomFromSignal, createExtension } from '@dxos/plugin-graph';
import { Collection, View, ViewAnnotation, getTypenameFromQuery } from '@dxos/schema';
import { isNonNullable } from '@dxos/util';

import { getActiveSpace } from '../hooks';
import { meta } from '../meta';
import { SPACE_TYPE, SpaceAction, type SpaceSettingsProps } from '../types';
import {
  SHARED,
  SPACES,
  atomFromQuery,
  constructObjectActions,
  constructSpaceActions,
  constructSpaceNode,
  createObjectNode,
  createStaticSchemaActions,
  createStaticSchemaNode,
} from '../util';

import { SpaceCapabilities } from './capabilities';

export default (context: PluginContext) => {
  // TODO(wittjosiah): Using `get` and being reactive seems to cause a bug with Atom where disposed atoms are accessed.
  const resolve = (get: Atom.Context) => (typename: string) =>
    context.getCapabilities(Capabilities.Metadata).find(({ id }) => id === typename)?.metadata ?? {};

  const spacesNode = {
    id: SPACES,
    type: SPACES,
    cacheable: ['label', 'role'],
    properties: {
      label: ['spaces label', { ns: meta.id }],
      icon: 'ph--planet--regular',
      testId: 'spacePlugin.spaces',
      role: 'branch',
      disposition: 'collection',
      disabled: true,
      childrenPersistenceClass: 'echo',
      onRearrangeChildren: async (nextOrder: Space[]) => {
        const { graph } = context.getCapability(Capabilities.AppGraph);
        const client = context.getCapability(ClientCapabilities.Client);

        // NOTE: This is needed to ensure order is updated by next animation frame.
        // TODO(wittjosiah): Is there a better way to do this?
        //   If not, graph should be passed as an argument to the extension.
        graph.sortEdges(
          SPACES,
          'outbound',
          nextOrder.map(({ id }) => id),
        );

        const {
          objects: [spacesOrder],
        } = await client.spaces.default.db.query(Filter.type(Type.Expando, { key: SHARED })).run();
        if (spacesOrder) {
          spacesOrder.order = nextOrder.map(({ id }) => id);
        } else {
          log.warn('spaces order object not found');
        }
      },
    },
  };

  return contributes(Capabilities.AppGraphBuilder, [
    // Primary actions.
    createExtension({
      id: `${meta.id}/primary-actions`,
      position: 'hoist',
      actions: (node) =>
        Atom.make((get) =>
          Function.pipe(
            get(node),
            Option.flatMap((node) => (node.id === ROOT_ID ? Option.some(node) : Option.none())),
            Option.map(() => [
              {
                id: SpaceAction.OpenCreateSpace._tag,
                data: async () => {
                  const { dispatchPromise: dispatch } = context.getCapability(Capabilities.IntentDispatcher);
                  await dispatch(createIntent(SpaceAction.OpenCreateSpace));
                },
                properties: {
                  label: ['create space label', { ns: meta.id }],
                  icon: 'ph--plus--regular',
                  testId: 'spacePlugin.createSpace',
                  disposition: 'menu',
                },
              },
              {
                id: SpaceAction.Join._tag,
                data: async () => {
                  const { dispatchPromise: dispatch } = context.getCapability(Capabilities.IntentDispatcher);
                  await dispatch(createIntent(SpaceAction.Join));
                },
                properties: {
                  label: ['join space label', { ns: meta.id }],
                  icon: 'ph--sign-in--regular',
                  testId: 'spacePlugin.joinSpace',
                  disposition: 'menu',
                },
              },
              {
                id: SpaceAction.OpenMembers._tag,
                data: async () => {
                  const { dispatchPromise: dispatch } = context.getCapability(Capabilities.IntentDispatcher);
                  const client = context.getCapability(ClientCapabilities.Client);
                  const space = getActiveSpace(context) ?? client.spaces.default;
                  await dispatch(createIntent(SpaceAction.OpenMembers, { space }));
                },
                properties: {
                  label: ['share space label', { ns: meta.id }],
                  icon: 'ph--users--regular',
                  testId: 'spacePlugin.shareSpace',
                  keyBinding: {
                    macos: 'meta+.',
                    windows: 'alt+.',
                  },
                },
              },
              {
                id: SpaceAction.OpenSettings._tag,
                data: async () => {
                  const { dispatchPromise: dispatch } = context.getCapability(Capabilities.IntentDispatcher);
                  const client = context.getCapability(ClientCapabilities.Client);
                  const space = getActiveSpace(context) ?? client.spaces.default;
                  await dispatch(createIntent(SpaceAction.OpenSettings, { space }));
                },
                properties: {
                  label: ['open current space settings label', { ns: meta.id }],
                  icon: 'ph--faders--regular',
                  keyBinding: {
                    macos: 'meta+shift+,',
                    windows: 'ctrl+shift+,',
                  },
                },
              },
            ]),
            Option.getOrElse(() => []),
          ),
        ),
    }),

    // Create spaces group node.
    createExtension({
      id: `${meta.id}/root`,
      position: 'hoist',
      connector: (node) =>
        Atom.make((get) =>
          Function.pipe(
            get(node),
            Option.flatMap((node) => (node.id === ROOT_ID ? Option.some(node) : Option.none())),
            Option.map(() => [spacesNode]),
            Option.getOrElse(() => []),
          ),
        ),
    }),

    // Create space nodes.
    createExtension({
      id: SPACES,
      connector: (node) => {
        // TODO(wittjosiah): Find a simpler way to define this type.
        let query: Database.QueryResult<Schema.Schema.Type<typeof Type.Expando>> | undefined;
        return Atom.make((get) =>
          Function.pipe(
            get(node),
            Option.flatMap((node) => (node.id === SPACES ? Option.some(node) : Option.none())),
            Option.map(() => {
              const state = context.getCapability(SpaceCapabilities.State);
              const client = context.getCapability(ClientCapabilities.Client);
              const spacesAtom = atomFromObservable(client.spaces);
              const isReadyAtom = atomFromObservable(client.spaces.isReady);

              const spaces = get(spacesAtom);
              const isReady = get(isReadyAtom);

              if (!spaces || !isReady) {
                return [];
              }

              const settings = get(context.capabilities(Capabilities.SettingsStore))[0]?.getStore<SpaceSettingsProps>(
                meta.id,
              )?.value;

              // TODO(wittjosiah): During client reset, accessing default space throws.
              try {
                if (!query) {
                  query = client.spaces.default.db.query(Filter.type(Type.Expando, { key: SHARED }));
                }
                const [spacesOrder] = get(atomFromQuery(query));
                return get(
                  atomFromSignal(() => {
                    const order: string[] = spacesOrder?.order ?? [];
                    const orderMap = new Map(order.map((id, index) => [id, index]));
                    return [
                      ...spaces
                        .filter((space) => orderMap.has(space.id))
                        .sort((a, b) => orderMap.get(a.id)! - orderMap.get(b.id)!),
                      ...spaces.filter((space) => !orderMap.has(space.id)),
                    ]
                      .filter((space) =>
                        settings?.showHidden ? true : space.state.get() !== SpaceState.SPACE_INACTIVE,
                      )
                      .map((space) =>
                        constructSpaceNode({
                          space,
                          navigable: state.navigableCollections,
                          personal: space === client.spaces.default,
                          namesCache: state.spaceNames,
                          resolve: resolve(get),
                        }),
                      );
                  }),
                );
              } catch {
                return [];
              }
            }),
            Option.getOrElse(() => []),
          ),
        );
      },
    }),

    // Create space actions.
    createExtension({
      id: `${meta.id}/actions`,
      actions: (node) =>
        Atom.make((get) =>
          Function.pipe(
            get(node),
            Option.flatMap((node) =>
              node.type === SPACE_TYPE && isSpace(node.data) ? Option.some(node.data) : Option.none(),
            ),
            Option.flatMap((space) => {
              const [dispatcher] = get(context.capabilities(Capabilities.IntentDispatcher));
              const [client] = get(context.capabilities(ClientCapabilities.Client));
              const [state] = get(context.capabilities(SpaceCapabilities.State));

              if (!dispatcher || !client || !state) {
                return Option.none();
              } else {
                return Option.some({
                  space,
                  dispatch: dispatcher.dispatchPromise,
                  personal: space === client.spaces.default,
                  migrating: state.sdkMigrationRunning[space.id],
                });
              }
            }),
            Option.map((params) => constructSpaceActions(params)),
            Option.getOrElse(() => []),
          ),
        ),
    }),

    // Create nodes for objects in the root collection of a space.
    createExtension({
      id: `${meta.id}/root-collection`,
      connector: (node) =>
        Atom.make((get) =>
          Function.pipe(
            get(node),
            Option.flatMap((node) =>
              node.type === SPACE_TYPE && isSpace(node.data) ? Option.some(node.data) : Option.none(),
            ),
            Option.map((space) => {
              const state = context.getCapability(SpaceCapabilities.State);
              const spaceState = get(atomFromObservable(space.state));
              if (spaceState !== SpaceState.SPACE_READY) {
                return [];
              }

              const collection = get(
                atomFromSignal(
                  () => space.properties[Collection.Collection.typename]?.target as Collection.Collection | undefined,
                ),
              );
              if (!collection) {
                return [];
              }

              return get(
                atomFromSignal(() =>
                  Function.pipe(
                    collection.objects,
                    Array.map((object) => object.target),
                    Array.filter(isNonNullable),
                    Array.map((object) =>
                      createObjectNode({
                        space,
                        object,
                        resolve: resolve(get),
                        navigable: state.navigableCollections,
                      }),
                    ),
                    Array.filter(isNonNullable),
                  ),
                ),
              );
            }),
            Option.getOrElse(() => []),
          ),
        ),
    }),

    // Create nodes for objects in a collection or by its DXN.
    createExtension({
      id: `${meta.id}/objects`,
      connector: (node) =>
        Atom.make((get) =>
          Function.pipe(
            get(node),
            Option.flatMap((node) =>
              Obj.instanceOf(Collection.Collection, node.data) ? Option.some(node.data) : Option.none(),
            ),
            Option.map((collection) => {
              const state = context.getCapability(SpaceCapabilities.State);
              const space = getSpace(collection);

              return get(
                atomFromSignal(() =>
                  Function.pipe(
                    collection.objects,
                    Array.map((object) => object.target),
                    Array.filter(isNonNullable),
                    Array.map(
                      (object) =>
                        space &&
                        createObjectNode({
                          object,
                          space,
                          resolve: resolve(get),
                          navigable: state.navigableCollections,
                        }),
                    ),
                    Array.filter(isNonNullable),
                  ),
                ),
              );
            }),
            Option.getOrElse(() => []),
          ),
        ),
      resolver: (id) => {
        let query: Database.QueryResult<Entity.Any> | undefined;
        return Atom.make((get) => {
          const client = context.getCapability(ClientCapabilities.Client);
          const dxn = DXN.tryParse(id)?.asEchoDXN();
          if (!dxn || !dxn.spaceId) {
            return null;
          }

          const space = client.spaces.get(dxn.spaceId);
          if (!space) {
            return null;
          }

          if (!query) {
            query = space.db.query(Filter.ids(dxn.echoId));
          }

          const object = get(atomFromQuery(query)).at(0);
          if (!Obj.isObject(object)) {
            return null;
          }

          return createObjectNode({ object, space, resolve: resolve(get), disposition: 'hidden' });
        });
      },
    }),

    // Create object nodes for schema-based system collections.
    createExtension({
      id: `${meta.id}/system-collections`,
      connector: (node) => {
        const client = context.getCapability(ClientCapabilities.Client);
        // TODO(wittjosiah): Find a simpler way to define this type.
        let query: Database.QueryResult<Schema.Schema.Type<typeof Type.Expando>> | undefined;
        return Atom.make((get) =>
          Function.pipe(
            get(node),
            Option.flatMap((node) =>
              Obj.instanceOf(Collection.Managed, node.data) ? Option.some(node.data) : Option.none(),
            ),
            Option.flatMap((collection) => {
              const space = getSpace(collection);
              const schema = client.graph.schemaRegistry.schemas.find(
                (schema) => Type.getTypename(schema) === collection.key,
              );
              return space && schema ? Option.some({ space, schema }) : Option.none();
            }),
            Option.map(({ space, schema }) => {
              if (!query) {
                query = space.db.query(Filter.type(schema));
              }
              return get(atomFromQuery(query))
                .map((object) =>
                  createObjectNode({
                    object,
                    space,
                    managedCollectionChild: true,
                    resolve: resolve(get),
                  }),
                )
                .filter(isNonNullable);
            }),
            Option.getOrElse(() => []),
          ),
        );
      },
    }),

    // Create branch nodes for static schema record types.
    createExtension({
      id: `${meta.id}/static-schemas`,
      connector: (node) => {
        const client = context.getCapability(ClientCapabilities.Client);
        return Atom.make((get) =>
          Function.pipe(
            get(node),
            Option.flatMap((node) =>
              Obj.instanceOf(Collection.Managed, node.data) && node.data.key === Type.getTypename(Type.PersistentType)
                ? Option.some(node.data)
                : Option.none(),
            ),
            Option.flatMap((collection) => {
              const space = getSpace(collection);
              return space?.properties.staticRecords ? Option.some(space) : Option.none();
            }),
            Option.map((space) => {
              return get(atomFromSignal(() => (space.properties.staticRecords ?? []) as string[]))
                .map((typename) =>
                  client.graph.schemaRegistry.schemas.find((schema) => Type.getTypename(schema) === typename),
                )
                .filter(isNonNullable)
                .map((schema) => createStaticSchemaNode({ schema, space }));
            }),
            Option.getOrElse(() => []),
          ),
        );
      },
    }),

    // Create actions for static schema record types.
    createExtension({
      id: `${meta.id}/static-schema-actions`,
      actions: (node) => {
        let query: Database.QueryResult<Obj.Any> | undefined;
        return Atom.make((get) => {
          // TODO(wittjosiah): Use schemaRegistry query once it support atom reactivity.
          const schemas = get(context.capabilities(ClientCapabilities.Schema))
            .flat()
            .filter((schema) => ViewAnnotation.get(schema).pipe(Option.getOrElse(() => false)));
          const filter = Filter.or(...schemas.map((schema) => Filter.type(schema)));

          return Function.pipe(
            get(node),
            Option.flatMap((node) => {
              const space = isSpace(node.properties.space) ? node.properties.space : undefined;
              return space && Schema.isSchema(node.data) ? Option.some({ space, schema: node.data }) : Option.none();
            }),
            Option.map(({ space, schema }) => {
              if (!query) {
                // TODO(wittjosiah): Ideally this query would traverse the view reference & filter by the query ast.
                // TODO(wittjosiah): Remove cast.
                query = space.db.query(filter) as unknown as Database.QueryResult<Obj.Any>;
              }

              const objects = get(atomFromQuery(query));
              const filteredViews = get(
                atomFromSignal(() =>
                  objects.filter(
                    (viewObject) =>
                      getTypenameFromQuery((viewObject as any).view.target?.query.ast) ===
                      Type.getTypename(schema as Type.Obj.Any),
                  ),
                ),
              );
              const deletable = filteredViews.length === 0;

              const [dispatcher] = get(context.capabilities(Capabilities.IntentDispatcher));
              if (!dispatcher) {
                return [];
              }

              // TODO(wittjosiah): Remove cast.
              return createStaticSchemaActions({
                schema: schema as Type.Obj.Any,
                space,
                dispatch: dispatcher.dispatchPromise,
                deletable,
              });
            }),
            Option.getOrElse(() => []),
          );
        });
      },
    }),

    // Create nodes for views of record types.
    createExtension({
      id: `${meta.id}/schema-views`,
      connector: (node) => {
        let query: Database.QueryResult<Obj.Any> | undefined;
        return Atom.make((get) => {
          // TODO(wittjosiah): Use schemaRegistry query once it support atom reactivity.
          const schemas = get(context.capabilities(ClientCapabilities.Schema))
            .flat()
            .filter((schema) => ViewAnnotation.get(schema).pipe(Option.getOrElse(() => false)));
          const filter = Filter.or(...schemas.map((schema) => Filter.type(schema)));

          return Function.pipe(
            get(node),
            Option.flatMap((node) => {
              const space = getSpace(node.data) ?? (isSpace(node.properties.space) ? node.properties.space : undefined);
              return space && (Obj.instanceOf(Type.PersistentType, node.data) || Schema.isSchema(node.data))
                ? Option.some({ space, schema: node.data })
                : Option.none();
            }),
            Option.map(({ space, schema }) => {
              if (!query) {
                // TODO(wittjosiah): Ideally this query would traverse the view reference & filter by the query ast.
                // TODO(wittjosiah): Remove cast.
                query = space.db.query(filter) as unknown as Database.QueryResult<Obj.Any>;
              }

              // TODO(wittjosiah): Remove casts.
              const typename = Schema.isSchema(schema) ? Type.getTypename(schema as Type.Obj.Any) : schema.typename;
              return get(atomFromQuery(query))
                .filter((object) =>
                  get(atomFromSignal(() => getTypenameFromQuery((object as any).view.target?.query.ast) === typename)),
                )
                .map((object) =>
                  get(
                    atomFromSignal(() =>
                      createObjectNode({
                        object,
                        space,
                        resolve: resolve(get),
                        droppable: false,
                      }),
                    ),
                  ),
                )
                .filter(isNonNullable);
            }),
            Option.getOrElse(() => []),
          );
        });
      },
    }),

    // Create collection actions and action groups.
    createExtension({
      id: `${meta.id}/object-actions`,
      actions: (node) => {
        let query: Database.QueryResult<Obj.Any> | undefined;
        return Atom.make((get) => {
          // TODO(wittjosiah): Use schemaRegistry query once it support atom reactivity.
          const schemas = get(context.capabilities(ClientCapabilities.Schema))
            .flat()
            .filter((schema) => ViewAnnotation.get(schema).pipe(Option.getOrElse(() => false)));
          const filter = Filter.or(...schemas.map((schema) => Filter.type(schema)));

          return Function.pipe(
            get(node),
            Option.flatMap((node) => {
              const space = getSpace(node.data);
              return space && Obj.isObject(node.data) && Obj.getTypename(node.data) === node.type
                ? Option.some({ space, object: node.data })
                : Option.none();
            }),
            Option.flatMap(({ space, object }) => {
              const isSchema = Obj.instanceOf(Type.PersistentType, object);
              if (!query && isSchema) {
                // TODO(wittjosiah): Ideally this query would traverse the view reference & filter by the query ast.
                // TODO(wittjosiah): Remove cast.
                query = space.db.query(filter) as unknown as Database.QueryResult<Obj.Any>;
              }

              let deletable =
                !isSchema &&
                // Don't allow system collections to be deleted.
                !Obj.instanceOf(Collection.Managed, object);
              if (isSchema && query) {
                const objects = get(atomFromQuery(query));
                const filteredViews = get(
                  atomFromSignal(() =>
                    objects.filter(
                      (viewObject) =>
                        getTypenameFromQuery((viewObject as any).view.target?.query.ast) === object.typename,
                    ),
                  ),
                );
                deletable = filteredViews.length === 0;
              }

              const [dispatcher] = get(context.capabilities(Capabilities.IntentDispatcher));
              const [appGraph] = get(context.capabilities(Capabilities.AppGraph));
              const [state] = get(context.capabilities(SpaceCapabilities.State));

              if (!dispatcher || !appGraph || !state) {
                return Option.none();
              } else {
                return Option.some({
                  object,
                  graph: appGraph.graph,
                  dispatch: dispatcher.dispatchPromise,
                  resolve: resolve(get),
                  deletable,
                  navigable: get(atomFromSignal(() => state.navigableCollections)),
                });
              }
            }),
            Option.map((params) => constructObjectActions(params)),
            Option.getOrElse(() => []),
          );
        });
      },
    }),

    // View selected objects.
    createExtension({
      id: `${meta.id}/selected-objects`,
      connector: (node) =>
        Atom.make((get) =>
          Function.pipe(
            get(node),
            Option.flatMap((node) => (Obj.instanceOf(View.View, node.data) ? Option.some(node) : Option.none())),
            Option.map((node) => [
              {
                id: [node.id, 'selected-objects'].join(ATTENDABLE_PATH_SEPARATOR),
                type: PLANK_COMPANION_TYPE,
                data: 'selected-objects',
                properties: {
                  label: ['companion selected objects label', { ns: meta.id }],
                  icon: 'ph--tree-view--regular',
                  disposition: 'hidden',
                },
              },
            ]),
            Option.getOrElse(() => []),
          ),
        ),
    }),

    // Object settings plank companion.
    createExtension({
      id: `${meta.id}/settings`,
      connector: (node) =>
        Atom.make((get) =>
          Function.pipe(
            get(node),
            Option.flatMap((node) => (Obj.isObject(node.data) ? Option.some(node) : Option.none())),
            Option.map((node) => [
              {
                id: [node.id, 'settings'].join(ATTENDABLE_PATH_SEPARATOR),
                type: PLANK_COMPANION_TYPE,
                data: 'settings',
                properties: {
                  label: ['object settings label', { ns: meta.id }],
                  icon: 'ph--sliders--regular',
                  disposition: 'hidden',
                  position: 'fallback',
                },
              },
            ]),
            Option.getOrElse(() => []),
          ),
        ),
    }),
  ]);
};

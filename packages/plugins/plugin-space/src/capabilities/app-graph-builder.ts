//
// Copyright 2025 DXOS.org
//

import { Atom } from '@effect-atom/atom-react';
import * as Array from 'effect/Array';
import * as Function from 'effect/Function';
import * as Option from 'effect/Option';
import * as Schema from 'effect/Schema';

import { Capabilities, type PluginContext, contributes, createIntent } from '@dxos/app-framework';
import { type QueryResult, type Space, SpaceState, getSpace, isSpace } from '@dxos/client/echo';
import { DXN, Filter, Obj, Query, Type } from '@dxos/echo';
import { log } from '@dxos/log';
import { ClientCapabilities } from '@dxos/plugin-client';
import { ATTENDABLE_PATH_SEPARATOR, PLANK_COMPANION_TYPE } from '@dxos/plugin-deck/types';
import { ROOT_ID, atomFromObservable, atomFromSignal, createExtension } from '@dxos/plugin-graph';
import { Collection, StoredSchema, View, getTypenameFromQuery } from '@dxos/schema';
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
  const resolve = (get: Atom.Context) => (typename: string) =>
    get(context.capabilities(Capabilities.Metadata)).find(({ id }) => id === typename)?.metadata ?? {};

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
      // resolver: ({ id }) => (id === SPACES ? spacesNode : undefined),
    }),

    // Create space nodes.
    createExtension({
      id: SPACES,
      connector: (node) => {
        let query: QueryResult<Type.Expando> | undefined;
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
      // resolver: ({ id }) => {
      //   if (id.length !== SPACE_ID_LENGTH) {
      //     return;
      //   }

      //   const client = context.requestCapability(ClientCapabilities.Client);
      //   const spaces = toSignal(
      //     (onChange) => client.spaces.subscribe(() => onChange()).unsubscribe,
      //     () => client.spaces.get(),
      //   );

      //   const isReady = toSignal(
      //     (onChange) => client.spaces.isReady.subscribe(() => onChange()).unsubscribe,
      //     () => client.spaces.isReady.get(),
      //   );

      //   if (!spaces || !isReady) {
      //     return;
      //   }

      //   const space = spaces.find((space) => space.id === id);
      //   if (!space) {
      //     return;
      //   }

      //   if (space.state.get() === SpaceState.SPACE_INACTIVE) {
      //     return false;
      //   } else if (space.state.get() !== SpaceState.SPACE_READY) {
      //     return undefined;
      //   } else {
      //     const state = context.requestCapability(SpaceCapabilities.State);
      //     return constructSpaceNode({
      //       space,
      //       navigable: state.navigableCollections,
      //       personal: space === client.spaces.default,
      //       namesCache: state.spaceNames,
      //       resolve,
      //     });
      //   }
      // },
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

    // Create nodes for objects in a collection or by its fully qualified id.
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
      // resolver: ({ id }) => {
      //   if (id.length !== FQ_ID_LENGTH) {
      //     return;
      //   }

      //   const [spaceId, objectId] = id.split(':');
      //   if (spaceId.length !== SPACE_ID_LENGTH && objectId.length !== OBJECT_ID_LENGTH) {
      //     return;
      //   }

      //   const client = context.requestCapability(ClientCapabilities.Client);
      //   const space = client.spaces.get().find((space) => space.id === spaceId);
      //   if (!space) {
      //     return;
      //   }

      //   const spaceState = toSignal(
      //     (onChange) => space.state.subscribe(() => onChange()).unsubscribe,
      //     () => space.state.get(),
      //     space.id,
      //   );
      //   if (spaceState !== SpaceState.SPACE_READY) {
      //     return;
      //   }

      //   const [object] = memoizeQuery(space, Query.select(Filter.ids(objectId)));
      //   if (!object) {
      //     return;
      //   }

      //   if (isDeleted(object)) {
      //     return false;
      //   } else {
      //     const state = context.requestCapability(SpaceCapabilities.State);
      //     return createObjectNode({ object, space, resolve, navigable: state.navigableCollections });
      //   }
      // },
    }),

    // Create nodes for objects in a query collection.
    createExtension({
      id: `${meta.id}/query-collection-objects`,
      connector: (node) => {
        let query: QueryResult<Type.Expando> | undefined;
        return Atom.make((get) =>
          Function.pipe(
            get(node),
            Option.flatMap((node) =>
              Obj.instanceOf(Collection.QueryCollection, node.data) ? Option.some(node.data) : Option.none(),
            ),
            Option.flatMap((collection) => {
              const space = getSpace(collection);
              const typename = getTypenameFromQuery(collection.query);
              return typename && space ? Option.some({ typename, space }) : Option.none();
            }),
            Option.map(({ typename, space }) => {
              const state = context.getCapability(SpaceCapabilities.State);
              if (!query) {
                query = space.db.query(
                  Query.without(
                    Query.select(Filter.typename(typename)),
                    // TODO(wittjosiah): This query is broader than it should be.
                    //   It will return all objects in the collection, not just the ones of the given type.
                    //   However this works fine for now because this query is only used for exclusions.
                    Query.select(Filter.typename(typename))
                      .referencedBy(Collection.Collection, 'objects')
                      .reference('objects'),
                  ),
                );
              }
              return (
                get(atomFromQuery(query))
                  // TODO(wittjosiah): This should be the default sort order.
                  .toSorted((a, b) => a.id.localeCompare(b.id))
                  .map((object) =>
                    get(
                      atomFromSignal(() =>
                        createObjectNode({
                          object,
                          space,
                          resolve: resolve(get),
                          droppable: false, // Cannot rearrange query collections.
                          navigable: state.navigableCollections,
                        }),
                      ),
                    ),
                  )
                  .filter(isNonNullable)
              );
            }),
            Option.getOrElse(() => []),
          ),
        );
      },
    }),

    // Static schema records.
    createExtension({
      id: `${meta.id}/static-schemas`,
      connector: (node) => {
        const client = context.getCapability(ClientCapabilities.Client);
        return Atom.make((get) =>
          Function.pipe(
            get(node),
            Option.flatMap((node) =>
              Obj.instanceOf(Collection.QueryCollection, node.data) &&
              getTypenameFromQuery(node.data.query) === StoredSchema.typename
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

    // Create static schema actions.
    createExtension({
      id: `${meta.id}/static-schema-actions`,
      actions: (node) => {
        let query: QueryResult<View.View> | undefined;
        return Atom.make((get) =>
          Function.pipe(
            get(node),
            Option.flatMap((node) => {
              const space = isSpace(node.properties.space) ? node.properties.space : undefined;
              return space && Schema.isSchema(node.data) ? Option.some({ space, schema: node.data }) : Option.none();
            }),
            Option.map(({ space, schema }) => {
              if (!query) {
                // TODO(wittjosiah): Support filtering by nested properties (e.g. `query.typename`).
                query = space.db.query(Filter.type(View.View));
              }

              const views = get(atomFromQuery(query));
              const filteredViews = get(
                atomFromSignal(() =>
                  // TODO(wittjosiah): Remove cast.
                  views.filter(
                    (view) => getTypenameFromQuery(view.query.ast) === Type.getTypename(schema as Type.Obj.Any),
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
          ),
        );
      },
    }),

    // Create nodes for schema views.
    createExtension({
      id: `${meta.id}/schema-views`,
      connector: (node) => {
        let query: QueryResult<View.View> | undefined;
        return Atom.make((get) =>
          Function.pipe(
            get(node),
            Option.flatMap((node) => {
              const space = getSpace(node.data) ?? (isSpace(node.properties.space) ? node.properties.space : undefined);
              return space && (Obj.instanceOf(StoredSchema, node.data) || Schema.isSchema(node.data))
                ? Option.some({ space, schema: node.data })
                : Option.none();
            }),
            Option.map(({ space, schema }) => {
              if (!query) {
                // TODO(wittjosiah): Support filtering by nested properties (e.g. `query.typename`).
                query = space.db.query(Filter.type(View.View));
              }

              // TODO(wittjosiah): Remove cast.
              const typename = Schema.isSchema(schema) ? Type.getTypename(schema as Type.Obj.Any) : schema.typename;
              return (
                get(atomFromQuery(query))
                  .filter((view) => getTypenameFromQuery(view.query.ast) === typename)
                  // Filter out Collection views from Projects.
                  .filter((view) =>
                    get(
                      atomFromSignal(() => {
                        const presentation = view.presentation.target;
                        if (presentation) {
                          const typename = Obj.getTypename(presentation);
                          return typename !== Collection.Collection.typename;
                        } else {
                          return false;
                        }
                      }),
                    ),
                  )
                  .map((view) =>
                    get(
                      atomFromSignal(() =>
                        createObjectNode({
                          object: view,
                          space,
                          resolve: resolve(get),
                          droppable: false,
                        }),
                      ),
                    ),
                  )
                  .filter(isNonNullable)
              );
            }),
            Option.getOrElse(() => []),
          ),
        );
      },
    }),

    // Create record nodes.
    createExtension({
      id: `${meta.id}/records`,
      resolver: (id) => {
        let query: QueryResult<Type.Expando> | undefined;
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
          if (!object) {
            return null;
          }

          return createObjectNode({
            object,
            space,
            resolve: resolve(get),
            disposition: 'hidden',
          });
        });
      },
    }),

    // Create collection actions and action groups.
    createExtension({
      id: `${meta.id}/object-actions`,
      actions: (node) => {
        let query: QueryResult<View.View> | undefined;
        return Atom.make((get) =>
          Function.pipe(
            get(node),
            Option.flatMap((node) => {
              const space = getSpace(node.data);
              return space && Obj.isObject(node.data) && Obj.getTypename(node.data) === node.type
                ? Option.some({ space, object: node.data })
                : Option.none();
            }),
            Option.flatMap(({ space, object }) => {
              const isSchema = Obj.instanceOf(StoredSchema, object);
              if (!query && isSchema) {
                // TODO(wittjosiah): Support filtering by nested properties (e.g. `query.typename`).
                query = space.db.query(Filter.type(View.View));
              }

              let deletable =
                !isSchema &&
                // Don't allow the Records smart collection to be deleted.
                !(
                  Obj.instanceOf(Collection.QueryCollection, object) &&
                  getTypenameFromQuery(object.query) === StoredSchema.typename
                );
              if (isSchema && query) {
                const views = get(atomFromQuery(query));
                const filteredViews = get(
                  atomFromSignal(() =>
                    views.filter((view) => getTypenameFromQuery(view.query.ast) === object.typename),
                  ),
                );
                deletable = filteredViews.length === 0;
              }

              const [dispatcher] = get(context.capabilities(Capabilities.IntentDispatcher));
              const [appGraph] = get(context.capabilities(Capabilities.AppGraph));
              const [state] = get(context.capabilities(SpaceCapabilities.State));
              const objectForms = get(context.capabilities(SpaceCapabilities.ObjectForm));

              if (!dispatcher || !appGraph || !state) {
                return Option.none();
              } else {
                return Option.some({
                  object,
                  graph: appGraph.graph,
                  dispatch: dispatcher.dispatchPromise,
                  objectForms,
                  deletable,
                  navigable: get(atomFromSignal(() => state.navigableCollections)),
                });
              }
            }),
            Option.map((params) => constructObjectActions(params)),
            Option.getOrElse(() => []),
          ),
        );
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

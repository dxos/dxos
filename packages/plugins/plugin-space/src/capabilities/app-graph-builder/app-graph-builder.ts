//
// Copyright 2025 DXOS.org
//

import { type Atom } from '@effect-atom/atom-react';
import * as Array from 'effect/Array';
import * as Effect from 'effect/Effect';
import * as Function from 'effect/Function';
import * as Option from 'effect/Option';
import * as Schema from 'effect/Schema';

import { Capability, Common } from '@dxos/app-framework';
import { type Space, SpaceState, getSpace, isSpace } from '@dxos/client/echo';
import { DXN, type Entity, Filter, Obj, type QueryResult, Type } from '@dxos/echo';
import { log } from '@dxos/log';
import { ClientCapabilities } from '@dxos/plugin-client';
import { ATTENDABLE_PATH_SEPARATOR, PLANK_COMPANION_TYPE } from '@dxos/plugin-deck/types';
import { CreateAtom, Graph, GraphBuilder, type Node, NodeMatcher } from '@dxos/plugin-graph';
import { Collection, ViewAnnotation, getTypenameFromQuery } from '@dxos/schema';
import { isNonNullable } from '@dxos/util';

import { getActiveSpace } from '../../hooks';
import { meta } from '../../meta';
import { SPACE_TYPE, SpaceCapabilities, SpaceOperation, type SpaceSettingsProps } from '../../types';
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
} from '../../util';

export default Capability.makeModule((context) =>
  Effect.sync(() => {
    // TODO(wittjosiah): Using `get` and being reactive seems to cause a bug with Atom where disposed atoms are accessed.
    const resolve = (get: Atom.Context) => (typename: string) =>
      context.getCapabilities(Common.Capability.Metadata).find(({ id }) => id === typename)?.metadata ?? {};

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
          const { graph } = context.getCapability(Common.Capability.AppGraph);
          const client = context.getCapability(ClientCapabilities.Client);

          // NOTE: This is needed to ensure order is updated by next animation frame.
          // TODO(wittjosiah): Is there a better way to do this?
          //   If not, graph should be passed as an argument to the extension.
          Graph.sortEdges(
            graph,
            SPACES,
            'outbound',
            nextOrder.map(({ id }) => id),
          );

          const [spacesOrder] = await client.spaces.default.db.query(Filter.type(Type.Expando, { key: SHARED })).run();
          if (spacesOrder) {
            spacesOrder.order = nextOrder.map(({ id }) => id);
          } else {
            log.warn('spaces order object not found');
          }
        },
      },
    };

    return Capability.contributes(Common.Capability.AppGraphBuilder, [
      // Primary actions.
      GraphBuilder.createExtension({
        id: `${meta.id}/primary-actions`,
        position: 'hoist',
        match: NodeMatcher.whenRoot,
        actions: () => [
          {
            id: SpaceOperation.OpenCreateSpace.meta.key,
            data: async () => {
              const { invokePromise } = context.getCapability(Common.Capability.OperationInvoker);
              await invokePromise(SpaceOperation.OpenCreateSpace);
            },
            properties: {
              label: ['create space label', { ns: meta.id }],
              icon: 'ph--plus--regular',
              testId: 'spacePlugin.createSpace',
              disposition: 'menu',
            },
          },
          {
            id: SpaceOperation.Join.meta.key,
            data: async () => {
              const { invokePromise } = context.getCapability(Common.Capability.OperationInvoker);
              await invokePromise(SpaceOperation.Join, {});
            },
            properties: {
              label: ['join space label', { ns: meta.id }],
              icon: 'ph--sign-in--regular',
              testId: 'spacePlugin.joinSpace',
              disposition: 'menu',
            },
          },
          {
            id: SpaceOperation.OpenMembers.meta.key,
            data: async () => {
              const { invokePromise } = context.getCapability(Common.Capability.OperationInvoker);
              const client = context.getCapability(ClientCapabilities.Client);
              const space = getActiveSpace(context) ?? client.spaces.default;
              await invokePromise(SpaceOperation.OpenMembers, { space });
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
            id: SpaceOperation.OpenSettings.meta.key,
            data: async () => {
              const { invokePromise } = context.getCapability(Common.Capability.OperationInvoker);
              const client = context.getCapability(ClientCapabilities.Client);
              const space = getActiveSpace(context) ?? client.spaces.default;
              await invokePromise(SpaceOperation.OpenSettings, { space });
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
        ],
      }),

      // Create spaces group node.
      GraphBuilder.createExtension({
        id: `${meta.id}/root`,
        position: 'hoist',
        match: NodeMatcher.whenRoot,
        connector: () => [spacesNode],
      }),

      // Create space nodes.
      GraphBuilder.createExtension({
        id: SPACES,
        match: NodeMatcher.whenId(SPACES),
        connector: (node, get) => {
          // TODO(wittjosiah): Find a simpler way to define this type.
          let query: QueryResult.QueryResult<Schema.Schema.Type<typeof Type.Expando>> | undefined;
          const state = context.getCapability(SpaceCapabilities.State);
          const client = context.getCapability(ClientCapabilities.Client);
          const spacesAtom = CreateAtom.fromObservable(client.spaces);
          const isReadyAtom = CreateAtom.fromObservable(client.spaces.isReady);

          const spaces = get(spacesAtom);
          const isReady = get(isReadyAtom);

          if (!spaces || !isReady) {
            return [];
          }

          const settings = get(context.capabilities(Common.Capability.SettingsStore))[0]?.getStore<SpaceSettingsProps>(
            meta.id,
          )?.value;

          // TODO(wittjosiah): During client reset, accessing default space throws.
          try {
            if (!query) {
              query = client.spaces.default.db.query(Filter.type(Type.Expando, { key: SHARED }));
            }
            const [spacesOrder] = get(atomFromQuery(query));
            return get(
              CreateAtom.fromSignal(() => {
                const order: string[] = spacesOrder?.order ?? [];
                const orderMap = new Map(order.map((id, index) => [id, index]));
                return [
                  ...spaces
                    .filter((space) => orderMap.has(space.id))
                    .sort((a, b) => orderMap.get(a.id)! - orderMap.get(b.id)!),
                  ...spaces.filter((space) => !orderMap.has(space.id)),
                ]
                  .filter((space) => (settings?.showHidden ? true : space.state.get() !== SpaceState.SPACE_INACTIVE))
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
        },
      }),

      // Create space actions.
      GraphBuilder.createExtension({
        id: `${meta.id}/actions`,
        match: (node) => (node.type === SPACE_TYPE && isSpace(node.data) ? Option.some(node.data) : Option.none()),
        actions: (space, get) => {
          const [operationInvoker] = get(context.capabilities(Common.Capability.OperationInvoker));
          const [client] = get(context.capabilities(ClientCapabilities.Client));
          const [state] = get(context.capabilities(SpaceCapabilities.State));

          if (!operationInvoker || !client || !state) {
            return [];
          }

          return constructSpaceActions({
            space,
            invokePromise: operationInvoker.invokePromise,
            personal: space === client.spaces.default,
            migrating: state.sdkMigrationRunning[space.id],
          });
        },
      }),

      // Create nodes for objects in the root collection of a space.
      GraphBuilder.createExtension({
        id: `${meta.id}/root-collection`,
        match: (node) => (node.type === SPACE_TYPE && isSpace(node.data) ? Option.some(node.data) : Option.none()),
        connector: (space, get) => {
          const state = context.getCapability(SpaceCapabilities.State);
          const spaceState = get(CreateAtom.fromObservable(space.state));
          if (spaceState !== SpaceState.SPACE_READY) {
            return [];
          }

          const collection = get(
            CreateAtom.fromSignal(
              () => space.properties[Collection.Collection.typename]?.target as Collection.Collection | undefined,
            ),
          );
          if (!collection) {
            return [];
          }

          return get(
            CreateAtom.fromSignal(() =>
              Function.pipe(
                collection.objects,
                Array.map((object) => object.target),
                Array.filter(isNonNullable),
                Array.map((object) =>
                  createObjectNode({
                    db: space.db,
                    object,
                    resolve: resolve(get),
                    navigable: state.navigableCollections,
                  }),
                ),
                Array.filter(isNonNullable),
              ),
            ),
          );
        },
      }),

      // Create nodes for objects in a collection or by its DXN.
      GraphBuilder.createExtension({
        id: `${meta.id}/objects`,
        match: (node) => (Obj.instanceOf(Collection.Collection, node.data) ? Option.some(node.data) : Option.none()),
        connector: (collection, get) => {
          const state = context.getCapability(SpaceCapabilities.State);
          const space = getSpace(collection);

          return get(
            CreateAtom.fromSignal(() =>
              Function.pipe(
                collection.objects,
                Array.map((object) => object.target),
                Array.filter(isNonNullable),
                Array.map(
                  (object) =>
                    space &&
                    createObjectNode({
                      object,
                      db: space.db,
                      resolve: resolve(get),
                      navigable: state.navigableCollections,
                    }),
                ),
                Array.filter(isNonNullable),
              ),
            ),
          );
        },
        resolver: (id, get) => {
          let query: QueryResult.QueryResult<Entity.Unknown> | undefined;
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
            query = space.db.query(Filter.id(dxn.echoId));
          }

          const object = get(atomFromQuery(query)).at(0);
          if (!Obj.isObject(object)) {
            return null;
          }

          return createObjectNode({
            object,
            db: space.db,
            resolve: resolve(get),
            disposition: 'hidden',
          });
        },
      }),

      // Create object nodes for schema-based system collections.
      GraphBuilder.createExtension({
        id: `${meta.id}/system-collections`,
        match: (node) => (Obj.instanceOf(Collection.Managed, node.data) ? Option.some(node.data) : Option.none()),
        connector: (collection, get) => {
          // TODO(wittjosiah): Find a simpler way to define this type.
          let query: QueryResult.QueryResult<Schema.Schema.Type<typeof Type.Expando>> | undefined;
          const client = get(context.capabilities(ClientCapabilities.Client)).at(0);
          const space = getSpace(collection);
          // TODO(wittjosiah): Support reactive schema registry queries.
          const schema = client?.graph.schemaRegistry
            .query({ typename: collection.key, location: ['runtime'] })
            .runSync()[0];
          if (!space || !schema) {
            return [];
          }

          if (!query) {
            query = space.db.query(Filter.type(schema));
          }
          return get(atomFromQuery(query))
            .map((object) =>
              createObjectNode({
                object,
                db: space.db,
                managedCollectionChild: true,
                resolve: resolve(get),
              }),
            )
            .filter(isNonNullable);
        },
      }),

      // Create branch nodes for static schema record types.
      GraphBuilder.createExtension({
        id: `${meta.id}/static-schemas`,
        match: (node: Node.Node) =>
          Obj.instanceOf(Collection.Managed, node.data) && node.data.key === Type.getTypename(Type.PersistentType)
            ? Option.some(node.data)
            : Option.none(),
        connector: (collection, get) => {
          const client = get(context.capabilities(ClientCapabilities.Client)).at(0);
          const space = getSpace(collection);
          if (!space?.properties.staticRecords) {
            return [];
          }

          // TODO(wittjosiah): Support reactive schema registry queries.
          return get(CreateAtom.fromSignal(() => (space.properties.staticRecords ?? []) as string[]))
            .map((typename) => client?.graph.schemaRegistry.query({ typename, location: ['runtime'] }).runSync()[0])
            .filter(isNonNullable)
            .map((schema) => createStaticSchemaNode({ schema, space }));
        },
      }),

      // Create actions for static schema record types.
      GraphBuilder.createExtension({
        id: `${meta.id}/static-schema-actions`,
        match: (node) => {
          const space = isSpace(node.properties.space) ? node.properties.space : undefined;
          return space && Schema.isSchema(node.data) ? Option.some({ space, schema: node.data }) : Option.none();
        },
        actions: ({ space, schema }, get) => {
          let query: QueryResult.QueryResult<Obj.Any> | undefined;
          // TODO(wittjosiah): Support reactive schema registry queries.
          const schemas =
            get(context.capabilities(ClientCapabilities.Client))
              .at(0)
              ?.graph.schemaRegistry.query({ location: ['runtime'] })
              .runSync() ?? [];
          const filter = Filter.or(
            ...schemas
              .filter((schema) => ViewAnnotation.get(schema).pipe(Option.getOrElse(() => false)))
              .map((schema) => Filter.type(schema)),
          );

          if (!query) {
            // TODO(wittjosiah): Ideally this query would traverse the view reference & filter by the query ast.
            // TODO(wittjosiah): Remove cast.
            query = space.db.query(filter) as unknown as QueryResult.QueryResult<Obj.Any>;
          }

          const objects = get(atomFromQuery(query));
          const filteredViews = get(
            CreateAtom.fromSignal(() =>
              objects.filter(
                (viewObject) =>
                  getTypenameFromQuery((viewObject as any).view.target?.query.ast) ===
                  Type.getTypename(schema as Type.Obj.Any),
              ),
            ),
          );
          const deletable = filteredViews.length === 0;

          const [operationInvoker] = get(context.capabilities(Common.Capability.OperationInvoker));
          if (!operationInvoker) {
            return [];
          }

          // TODO(wittjosiah): Remove cast.
          return createStaticSchemaActions({
            schema: schema as Type.Obj.Any,
            space,
            invokePromise: operationInvoker.invokePromise,
            deletable,
          });
        },
      }),

      // Create nodes for views of record types.
      GraphBuilder.createExtension({
        id: `${meta.id}/schema-views`,
        match: (node) => {
          const space = getSpace(node.data) ?? (isSpace(node.properties.space) ? node.properties.space : undefined);
          return space && (Obj.instanceOf(Type.PersistentType, node.data) || Schema.isSchema(node.data))
            ? Option.some({ space, schema: node.data })
            : Option.none();
        },
        connector: ({ space, schema }, get) => {
          let query: QueryResult.QueryResult<Obj.Any> | undefined;
          // TODO(wittjosiah): Support reactive schema registry queries.
          const schemas =
            get(context.capabilities(ClientCapabilities.Client))
              .at(0)
              ?.graph.schemaRegistry.query({ location: ['runtime'] })
              .runSync() ?? [];
          const filter = Filter.or(
            ...schemas
              .filter((schema) => ViewAnnotation.get(schema).pipe(Option.getOrElse(() => false)))
              .map((schema) => Filter.type(schema)),
          );

          if (!query) {
            // TODO(wittjosiah): Ideally this query would traverse the view reference & filter by the query ast.
            // TODO(wittjosiah): Remove cast.
            query = space.db.query(filter) as unknown as QueryResult.QueryResult<Obj.Any>;
          }

          // TODO(wittjosiah): Remove casts.
          const typename = Schema.isSchema(schema) ? Type.getTypename(schema as Type.Obj.Any) : schema.typename;
          return get(atomFromQuery(query))
            .filter((object) =>
              get(
                CreateAtom.fromSignal(() => getTypenameFromQuery((object as any).view.target?.query.ast) === typename),
              ),
            )
            .map((object) =>
              get(
                CreateAtom.fromSignal(() =>
                  createObjectNode({
                    object,
                    db: space.db,
                    resolve: resolve(get),
                    droppable: false,
                  }),
                ),
              ),
            )
            .filter(isNonNullable);
        },
      }),

      // Create collection actions and action groups.
      GraphBuilder.createExtension({
        id: `${meta.id}/object-actions`,
        match: (node) => {
          const space = getSpace(node.data);
          return space && Obj.isObject(node.data) && Obj.getTypename(node.data) === node.type
            ? Option.some({ space, object: node.data })
            : Option.none();
        },
        actions: ({ space, object }, get) => {
          let query: QueryResult.QueryResult<Obj.Any> | undefined;
          // TODO(wittjosiah): Support reactive schema registry queries.
          const schemas =
            get(context.capabilities(ClientCapabilities.Client))
              .at(0)
              ?.graph.schemaRegistry.query({ location: ['runtime'] })
              .runSync() ?? [];
          const filter = Filter.or(
            ...schemas
              .filter((schema) => ViewAnnotation.get(schema).pipe(Option.getOrElse(() => false)))
              .map((schema) => Filter.type(schema)),
          );

          const isSchema = Obj.instanceOf(Type.PersistentType, object);
          if (!query && isSchema) {
            // TODO(wittjosiah): Ideally this query would traverse the view reference & filter by the query ast.
            // TODO(wittjosiah): Remove cast.
            query = space.db.query(filter) as unknown as QueryResult.QueryResult<Obj.Any>;
          }

          let deletable =
            !isSchema &&
            // Don't allow system collections to be deleted.
            !Obj.instanceOf(Collection.Managed, object);
          if (isSchema && query) {
            const objects = get(atomFromQuery(query));
            const filteredViews = get(
              CreateAtom.fromSignal(() =>
                objects.filter(
                  (viewObject) => getTypenameFromQuery((viewObject as any).view.target?.query.ast) === object.typename,
                ),
              ),
            );
            deletable = filteredViews.length === 0;
          }

          const [operationInvoker] = get(context.capabilities(Common.Capability.OperationInvoker));
          const [appGraph] = get(context.capabilities(Common.Capability.AppGraph));
          const [state] = get(context.capabilities(SpaceCapabilities.State));

          if (!operationInvoker || !appGraph || !state) {
            return [];
          }

          return constructObjectActions({
            object,
            graph: appGraph.graph,
            invokePromise: operationInvoker.invokePromise,
            resolve: resolve(get),
            context,
            deletable,
            navigable: get(CreateAtom.fromSignal(() => state.navigableCollections)),
          });
        },
      }),

      // View selected objects.
      GraphBuilder.createExtension({
        id: `${meta.id}/selected-objects`,
        match: (node) => {
          if (!Obj.isObject(node.data)) {
            return Option.none();
          }

          const schema = Obj.getSchema(node.data);
          const isView = Option.fromNullable(schema).pipe(
            Option.flatMap((schema) => ViewAnnotation.get(schema)),
            Option.getOrElse(() => false),
          );
          if (!isView) {
            return Option.none();
          }

          return Option.some(node);
        },
        connector: (node) => [
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
        ],
      }),

      // Object settings plank companion.
      GraphBuilder.createExtension({
        id: `${meta.id}/settings`,
        match: (node) => (Obj.isObject(node.data) ? Option.some(node) : Option.none()),
        connector: (node) => [
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
        ],
      }),
    ]);
  }),
);

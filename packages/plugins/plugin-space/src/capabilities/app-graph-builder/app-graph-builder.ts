//
// Copyright 2025 DXOS.org
//

import { type Atom } from '@effect-atom/atom-react';
import * as Effect from 'effect/Effect';
import * as Option from 'effect/Option';
import * as Schema from 'effect/Schema';

import { Capability, Common } from '@dxos/app-framework';
import { type Space, SpaceState, getSpace, isSpace, parseId } from '@dxos/client/echo';
import { DXN, Filter, Obj, type Ref, Type } from '@dxos/echo';
import { AtomObj, AtomQuery } from '@dxos/echo-atom';
import { Operation } from '@dxos/operation';
import { ClientCapabilities } from '@dxos/plugin-client';
import { ATTENDABLE_PATH_SEPARATOR, PLANK_COMPANION_TYPE } from '@dxos/plugin-deck/types';
import { CreateAtom, GraphBuilder, type Node, NodeMatcher } from '@dxos/plugin-graph';
import { Collection, Expando, ViewAnnotation, getTypenameFromQuery } from '@dxos/schema';
import { isNonNullable } from '@dxos/util';

import { getActiveSpace } from '../../hooks';
import { meta } from '../../meta';
import { SPACE_TYPE, SpaceCapabilities, SpaceOperation, type SpacePluginOptions } from '../../types';
import {
  SHARED,
  constructObjectActions,
  constructSpaceActions,
  constructSpaceNode,
  createObjectNode,
  createStaticSchemaActions,
  createStaticSchemaNode,
} from '../../util';

/** Match space nodes and return the Space object. */
const whenSpace = (node: Node.Node): Option.Option<Space> =>
  node.type === SPACE_TYPE && isSpace(node.data) ? Option.some(node.data) : Option.none();

export default Capability.makeModule(
  Effect.fnUntraced(function* (props?: SpacePluginOptions) {
    const { shareableLinkOrigin = window.location.origin } = props ?? {};
    const capabilities = yield* Capability.Service;

    // TODO(wittjosiah): Using `get` and being reactive seems to cause a bug with Atom where disposed atoms are accessed.
    const resolve = (get: Atom.Context) => (typename: string) =>
      capabilities.getAll(Common.Capability.Metadata).find(({ id }) => id === typename)?.metadata ?? {};

    const extensions = yield* Effect.all([
      // Primary actions.
      GraphBuilder.createExtension({
        id: `${meta.id}/primary-actions`,
        position: 'hoist',
        match: NodeMatcher.whenRoot,
        actions: () =>
          Effect.succeed([
            {
              id: SpaceOperation.OpenCreateSpace.meta.key,
              data: () => Operation.invoke(SpaceOperation.OpenCreateSpace),
              properties: {
                label: ['create space label', { ns: meta.id }],
                icon: 'ph--plus--regular',
                testId: 'spacePlugin.createSpace',
                disposition: 'menu',
              },
            },
            {
              id: SpaceOperation.Join.meta.key,
              data: () => Operation.invoke(SpaceOperation.Join, {}),
              properties: {
                label: ['join space label', { ns: meta.id }],
                icon: 'ph--sign-in--regular',
                testId: 'spacePlugin.joinSpace',
                disposition: 'menu',
              },
            },
            {
              id: SpaceOperation.OpenMembers.meta.key,
              data: Effect.fnUntraced(function* () {
                const client = yield* Capability.get(ClientCapabilities.Client);
                const space = getActiveSpace(capabilities) ?? client.spaces.default;
                yield* Operation.invoke(SpaceOperation.OpenMembers, { space });
              }),
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
              data: Effect.fnUntraced(function* () {
                const client = yield* Capability.get(ClientCapabilities.Client);
                const space = getActiveSpace(capabilities) ?? client.spaces.default;
                yield* Operation.invoke(SpaceOperation.OpenSettings, { space });
              }),
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
      }),

      // Create space nodes.
      GraphBuilder.createExtension({
        id: `${meta.id}/spaces`,
        match: NodeMatcher.whenRoot,
        connector: (node, get) => {
          const client = capabilities.get(ClientCapabilities.Client);
          const stateAtom = capabilities.get(SpaceCapabilities.State);
          const ephemeralAtom = capabilities.get(SpaceCapabilities.EphemeralState);
          const spacesAtom = CreateAtom.fromObservable(client.spaces);
          const isReadyAtom = CreateAtom.fromObservable(client.spaces.isReady);

          const spaces = get(spacesAtom);
          const isReady = get(isReadyAtom);

          if (!spaces || !isReady) {
            return Effect.succeed([]);
          }

          const settingsAtom = capabilities.get(SpaceCapabilities.Settings);
          const settings = get(settingsAtom);
          const state = get(stateAtom);
          const ephemeralState = get(ephemeralAtom);

          try {
            const [spacesOrder] = get(
              AtomQuery.make(client.spaces.default.db, Filter.type(Expando.Expando, { key: SHARED })),
            );
            const { graph } = capabilities.get(Common.Capability.AppGraph);

            // Get order from spacesOrder snapshot using AtomObj (cached via Atom.family).
            const spacesOrderSnapshot = spacesOrder ? get(AtomObj.make(spacesOrder)) : undefined;
            const order: string[] = (spacesOrderSnapshot as any)?.order ?? [];
            const orderMap = new Map(order.map((id, index) => [id, index]));

            // Subscribe to space states for filtering.
            const spaceStates = spaces.map((space) => get(CreateAtom.fromObservable(space.state)));

            // Subscribe to space properties to react when root collection is assigned.
            spaces.forEach((space) => {
              if (space.state.get() === SpaceState.SPACE_READY) {
                get(AtomObj.make(space.properties));
              }
            });

            return Effect.succeed(
              [
                ...spaces
                  .filter((space) => orderMap.has(space.id))
                  .sort((a, b) => orderMap.get(a.id)! - orderMap.get(b.id)!),
                ...spaces.filter((space) => !orderMap.has(space.id)),
              ]
                .filter((space, i) => (settings?.showHidden ? true : spaceStates[i] !== SpaceState.SPACE_INACTIVE))
                .map((space) =>
                  constructSpaceNode({
                    space,
                    navigable: ephemeralState.navigableCollections,
                    personal: space === client.spaces.default,
                    namesCache: state.spaceNames,
                    resolve: resolve(get),
                    graph,
                    spacesOrder,
                  }),
                ),
            );
          } catch {
            return Effect.succeed([]);
          }
        },
        resolver: (id, get) => {
          // Resolve space ID to space node.
          const { spaceId } = parseId(id);
          if (!spaceId) {
            return Effect.succeed(null);
          }

          const client = capabilities.get(ClientCapabilities.Client);

          // Subscribe to spaces observable to react when space becomes available.
          const spaces = get(CreateAtom.fromObservable(client.spaces));
          const space = spaces?.find((s) => s.id === spaceId);
          if (!space) {
            return Effect.succeed(null);
          }

          // Only subscribe to these atoms if the space exists.
          const state = get(capabilities.get(SpaceCapabilities.State));
          const ephemeralState = get(capabilities.get(SpaceCapabilities.EphemeralState));

          const { graph } = capabilities.get(Common.Capability.AppGraph);
          const [spacesOrder] = get(
            AtomQuery.make(client.spaces.default.db, Filter.type(Expando.Expando, { key: SHARED })),
          );

          return Effect.succeed(
            constructSpaceNode({
              space,
              navigable: ephemeralState.navigableCollections,
              personal: space === client.spaces.default,
              namesCache: state.spaceNames,
              resolve: resolve(get),
              graph,
              spacesOrder,
            }),
          );
        },
      }),

      // Create space actions.
      GraphBuilder.createExtension({
        id: `${meta.id}/actions`,
        match: whenSpace,
        actions: (space, get) => {
          const [client] = get(capabilities.atom(ClientCapabilities.Client));
          const ephemeralAtom = capabilities.get(SpaceCapabilities.EphemeralState);
          const ephemeralState = get(ephemeralAtom);

          if (!client) {
            return Effect.succeed([]);
          }

          return Effect.succeed(
            constructSpaceActions({
              space,
              personal: space === client.spaces.default,
              migrating: ephemeralState.sdkMigrationRunning[space.id],
            }),
          );
        },
      }),

      // Create nodes for objects in the root collection of a space.
      GraphBuilder.createExtension({
        id: `${meta.id}/root-collection`,
        match: whenSpace,
        connector: (space, get) => {
          const ephemeralAtom = capabilities.get(SpaceCapabilities.EphemeralState);
          const ephemeralState = get(ephemeralAtom);
          const spaceState = get(CreateAtom.fromObservable(space.state));
          if (spaceState !== SpaceState.SPACE_READY) {
            return Effect.succeed([]);
          }

          // Get the collection ref from space.properties snapshot (AtomObj cached via Atom.family).
          const propertiesSnapshot = get(AtomObj.make(space.properties));
          const collectionRef = propertiesSnapshot[Collection.Collection.typename] as
            | Ref.Ref<Collection.Collection>
            | undefined;
          // Resolve the collection using AtomObj (subscribes to collection changes).
          const collection = collectionRef ? get(AtomObj.make(collectionRef)) : undefined;
          if (!collection) {
            return Effect.succeed([]);
          }

          const rawRefs = collection.objects ?? [];

          // TODO(wittjosiah): Workaround for Obj.getTypename not working on snapshots.
          //   AtomObj.make(ref) returns snapshots (plain objects without ECHO metadata),
          //   but createObjectNode needs live objects to access typename and other metadata.
          //   Once Obj.getTypename works on snapshots, we can use snapshots directly.
          const objects = rawRefs
            .map((ref) => {
              // Subscribe to the ref for reactivity (triggers re-render when target changes).
              get(AtomObj.make(ref));
              // Return the live object for createObjectNode (has typename metadata).
              return ref.target;
            })
            .filter(isNonNullable);

          return Effect.succeed(
            objects
              .map((object) =>
                createObjectNode({
                  db: space.db,
                  object,
                  resolve: resolve(get),
                  navigable: ephemeralState.navigableCollections,
                  parentCollection: collectionRef?.target,
                }),
              )
              .filter(isNonNullable),
          );
        },
      }),

      // Create nodes for objects in a collection or by its DXN.
      GraphBuilder.createExtension({
        id: `${meta.id}/objects`,
        match: (node) => (Obj.instanceOf(Collection.Collection, node.data) ? Option.some(node.data) : Option.none()),
        connector: (collection, get) => {
          const ephemeralAtom = capabilities.get(SpaceCapabilities.EphemeralState);
          const ephemeralState = get(ephemeralAtom);
          const space = getSpace(collection);

          // Get collection snapshot using AtomObj (cached via Atom.family).
          const collectionSnapshot = get(AtomObj.make(collection));
          const refs = collectionSnapshot.objects ?? [];

          // TODO(wittjosiah): Workaround for Obj.getTypename not working on snapshots.
          //   See root-collection connector for details.
          const objects = refs
            .map((ref) => {
              get(AtomObj.make(ref));
              return ref.target;
            })
            .filter(isNonNullable);

          return Effect.succeed(
            objects
              .map(
                (object) =>
                  space &&
                  createObjectNode({
                    object,
                    db: space.db,
                    resolve: resolve(get),
                    navigable: ephemeralState.navigableCollections,
                    parentCollection: collection,
                  }),
              )
              .filter(isNonNullable),
          );
        },
        resolver: (id, get) => {
          const client = capabilities.get(ClientCapabilities.Client);
          const dxn = DXN.tryParse(id)?.asEchoDXN();
          if (!dxn || !dxn.spaceId) {
            return Effect.succeed(null);
          }

          const space = client.spaces.get(dxn.spaceId);
          if (!space) {
            return Effect.succeed(null);
          }

          const object = get(AtomQuery.make(space.db, Filter.id(dxn.echoId))).at(0);
          if (!Obj.isObject(object)) {
            return Effect.succeed(null);
          }

          return Effect.succeed(
            createObjectNode({
              object,
              db: space.db,
              resolve: resolve(get),
              disposition: 'hidden',
            }),
          );
        },
      }),

      // Create object nodes for schema-based system collections.
      GraphBuilder.createExtension({
        id: `${meta.id}/system-collections`,
        match: (node) => (Obj.instanceOf(Collection.Managed, node.data) ? Option.some(node.data) : Option.none()),
        connector: (collection, get) => {
          const client = get(capabilities.atom(ClientCapabilities.Client)).at(0);
          const space = getSpace(collection);
          const schema = client?.graph.schemaRegistry
            .query({ typename: collection.key, location: ['runtime'], includeSystem: true })
            .runSync()[0];
          if (!space || !schema) {
            return Effect.succeed([]);
          }

          return Effect.succeed(
            get(AtomQuery.make(space.db, Filter.type(schema)))
              .map((object) => {
                get(AtomObj.make(object));
                return createObjectNode({
                  object,
                  db: space.db,
                  managedCollectionChild: true,
                  resolve: resolve(get),
                });
              })
              .filter(isNonNullable),
          );
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
          const client = get(capabilities.atom(ClientCapabilities.Client)).at(0);
          const space = getSpace(collection);
          if (!space) {
            return Effect.succeed([]);
          }

          // Get staticRecords from properties snapshot (AtomObj cached via Atom.family).
          const propertiesSnapshot = get(AtomObj.make(space.properties));
          const staticRecords = (propertiesSnapshot.staticRecords ?? []) as string[];

          return Effect.succeed(
            staticRecords
              .map((typename) => client?.graph.schemaRegistry.query({ typename, location: ['runtime'] }).runSync()[0])
              .filter(isNonNullable)
              .map((schema) => createStaticSchemaNode({ schema, space })),
          );
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
          const schemas =
            get(capabilities.atom(ClientCapabilities.Client))
              .at(0)
              ?.graph.schemaRegistry.query({ location: ['runtime'] })
              .runSync() ?? [];
          const filter = Filter.or(
            ...schemas
              .filter((schema) => ViewAnnotation.get(schema).pipe(Option.getOrElse(() => false)))
              .map((schema) => Filter.type(schema)),
          );

          const objects = get(AtomQuery.make(space.db, filter));

          // Filter views that match the schema typename using AtomObj and AtomRef (cached via Atom.family).
          const targetTypename = Type.getTypename(schema as Type.Obj.Any);
          const filteredViews = objects.filter((viewObject) => {
            const viewSnapshot = get(AtomObj.make(viewObject));
            const viewRef = (viewSnapshot as any).view;
            const viewTarget = viewRef ? get(AtomObj.make(viewRef)) : undefined;
            return getTypenameFromQuery((viewTarget as any)?.query?.ast) === targetTypename;
          });
          const deletable = filteredViews.length === 0;

          return Effect.succeed(
            createStaticSchemaActions({
              schema: schema as Type.Obj.Any,
              space,
              deletable,
            }),
          );
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
          const schemas =
            get(capabilities.atom(ClientCapabilities.Client))
              .at(0)
              ?.graph.schemaRegistry.query({ location: ['runtime'] })
              .runSync() ?? [];
          const filter = Filter.or(
            ...schemas
              .filter((schema) => ViewAnnotation.get(schema).pipe(Option.getOrElse(() => false)))
              .map((schema) => Filter.type(schema)),
          );

          const typename = Schema.isSchema(schema) ? Type.getTypename(schema as Type.Obj.Any) : schema.typename;
          const objects = get(AtomQuery.make(space.db, filter));

          // Filter and map using AtomObj and AtomRef (cached via Atom.family).
          return Effect.succeed(
            objects
              .filter((object) => {
                const objectSnapshot = get(AtomObj.make(object));
                const viewRef = (objectSnapshot as any).view;
                const viewTarget = viewRef ? get(AtomObj.make(viewRef)) : undefined;
                return getTypenameFromQuery((viewTarget as any)?.query?.ast) === typename;
              })
              .map((object) =>
                createObjectNode({
                  object,
                  db: space.db,
                  resolve: resolve(get),
                  droppable: false,
                }),
              )
              .filter(isNonNullable),
          );
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
          const schemas =
            get(capabilities.atom(ClientCapabilities.Client))
              .at(0)
              ?.graph.schemaRegistry.query({ location: ['runtime'] })
              .runSync() ?? [];
          const filter = Filter.or(
            ...schemas
              .filter((schema) => ViewAnnotation.get(schema).pipe(Option.getOrElse(() => false)))
              .map((schema) => Filter.type(schema)),
          );

          const isSchema = Obj.instanceOf(Type.PersistentType, object);

          let deletable = !isSchema && !Obj.instanceOf(Collection.Managed, object);
          if (isSchema) {
            const objects = get(AtomQuery.make(space.db, filter));
            // Filter views using AtomObj and AtomRef (cached via Atom.family).
            const filteredViews = objects.filter((viewObject) => {
              const viewSnapshot = get(AtomObj.make(viewObject));
              const viewRef = (viewSnapshot as any).view;
              const viewTarget = viewRef ? get(AtomObj.make(viewRef)) : undefined;
              return getTypenameFromQuery((viewTarget as any)?.query?.ast) === object.typename;
            });
            deletable = filteredViews.length === 0;
          }

          const [appGraph] = get(capabilities.atom(Common.Capability.AppGraph));
          const ephemeralAtom = capabilities.get(SpaceCapabilities.EphemeralState);
          const ephemeralState = get(ephemeralAtom);

          if (!appGraph) {
            return Effect.succeed([]);
          }

          return Effect.succeed(
            constructObjectActions({
              object,
              graph: appGraph.graph,
              resolve: resolve(get),
              capabilities,
              deletable,
              navigable: ephemeralState.navigableCollections,
              shareableLinkOrigin,
            }),
          );
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
        connector: (node) =>
          Effect.succeed([
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
      }),

      // Object settings plank companion.
      GraphBuilder.createExtension({
        id: `${meta.id}/settings`,
        match: NodeMatcher.whenEchoObjectMatches,
        connector: (node) =>
          Effect.succeed([
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
      }),
    ]);

    return Capability.contributes(Common.Capability.AppGraphBuilder, extensions);
  }),
);

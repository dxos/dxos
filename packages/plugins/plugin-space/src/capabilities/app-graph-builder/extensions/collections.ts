//
// Copyright 2025 DXOS.org
//

import * as Effect from 'effect/Effect';
import * as Option from 'effect/Option';

import { Capability } from '@dxos/app-framework';
import { AppAnnotation, AppCapabilities, AppNode, AppNodeMatcher, LayoutOperation, Paths } from '@dxos/app-toolkit';
import { type Space, isSpace } from '@dxos/client/echo';
import { Operation } from '@dxos/compute';
import { Annotation, Collection, Database, Filter, Obj, Query, Type } from '@dxos/echo';
import { invariant } from '@dxos/invariant';
import { SpaceId } from '@dxos/keys';
import { log } from '@dxos/log';
import { ClientCapabilities } from '@dxos/plugin-client';
import { Graph, GraphBuilder, Node } from '@dxos/plugin-graph';
import { isNonNullable } from '@dxos/util';

import { meta } from '#meta';
import { SpaceOperation } from '#operations';
import { SpaceCapabilities } from '#types';

import {
  COLLECTIONS_SECTION_TYPE,
  COPY_LINK_LABEL,
  CREATE_OBJECT_IN_COLLECTION_LABEL,
  EXPOSE_OBJECT_LABEL,
} from './shared';

//
// Extension Factory
//

/** Creates collection-related extensions: collections section, collections, objects, and object actions. */
export const createCollectionExtensions = Effect.fnUntraced(function* ({
  shareableLinkOrigin,
}: {
  shareableLinkOrigin: string;
}) {
  const capabilities = yield* Capability.Service;

  return yield* Effect.all([
    // Content section group — created alongside collections so the group always
    // appears when the space plugin is active and hides when there are no children.
    GraphBuilder.createExtension({
      id: Paths.GroupSegments.content,
      match: AppNodeMatcher.whenSpace,
      connector: (space) =>
        Effect.succeed([
          AppNode.makeGroup({
            id: Paths.GroupSegments.content,
            type: Paths.GroupTypes.content,
            label: ['nav-tree-group-content.label', { ns: meta.profile.key }],
            space,
            position: 200,
          }),
        ]),
    }),

    // Collections section virtual node under the content group.
    GraphBuilder.createExtension({
      id: 'collectionsSection',
      match: AppNodeMatcher.whenNavTreeGroup(Paths.GroupTypes.content),
      connector: (space, get) => {
        get(Obj.atom(space.properties));
        const collectionRef = Annotation.get(space.properties, AppAnnotation.RootCollectionAnnotation).pipe(
          Option.getOrUndefined,
        );
        if (collectionRef) {
          get(Obj.atom(collectionRef));
        }
        const rootCollection = collectionRef?.target;
        const collectionPartials = rootCollection
          ? AppNode.getCollectionGraphNodePartials({ db: space.db, collection: rootCollection })
          : undefined;

        return Effect.succeed([
          Node.make({
            id: Paths.Segments.collections,
            type: COLLECTIONS_SECTION_TYPE,
            data: null,
            properties: {
              label: ['collections-section.label', { ns: meta.profile.key }],
              icon: 'ph--folder--regular',
              iconHue: 'indigo',
              role: 'branch',
              testId: 'spacePlugin.collectionsSection',
              draggable: false,
              droppable: false,
              space,
              ...collectionPartials,
            },
          }),
        ]);
      },
    }),

    // Root collection objects under the Collections virtual node. Shares the `object` urlKey with the
    // nested-collection `objects` connector below so an object is addressed the same way wherever it
    // sits in the collection tree (the key names the *collection subgraph*, not the container's type;
    // the database subgraph addresses the same object under `db`). Its shape is fixed
    // (`root/<space>/content/collections/<id>`), so it declares a static `path` for deterministic
    // forward resolution; the recursive `objects` connector below resolves dynamically instead.
    GraphBuilder.createExtension({
      id: 'collections',
      url: { key: 'object', kind: 'item', path: [Paths.GroupSegments.content, Paths.Segments.collections] },
      match: (node) => {
        const space = isSpace(node.properties.space) ? node.properties.space : undefined;
        return node.type === COLLECTIONS_SECTION_TYPE && space ? Option.some(space) : Option.none();
      },
      connector: (space, get) => {
        const ephemeralAtom = capabilities.get(SpaceCapabilities.EphemeralState);
        const ephemeralState = get(ephemeralAtom);

        get(Obj.atom(space.properties));
        const collectionRef = Annotation.get(space.properties, AppAnnotation.RootCollectionAnnotation).pipe(
          Option.getOrUndefined,
        );
        const collection = collectionRef ? get(Obj.atom(collectionRef)) : undefined;
        if (!collection) {
          return Effect.succeed([]);
        }

        const rawRefs = collection.objects ?? [];

        const objects = rawRefs
          .map((ref: any) => {
            get(Obj.atom(ref));
            return ref.target;
          })
          .filter(isNonNullable);

        return Effect.succeed(
          objects
            .map((object: Obj.Unknown) =>
              AppNode.makeObject({
                get,
                db: space.db,
                object,
                navigable: ephemeralState.navigableCollections,
                canDrop: AppNode.CAN_DROP_COLLECTION_ITEM,
                onRearrange: collectionRef?.target
                  ? AppNode.makeCollectionRearrangeCallback(collectionRef.target)
                  : undefined,
              }),
            )
            .filter(isNonNullable),
        );
      },
    }),

    // Children of Collection.Collection nodes.
    GraphBuilder.createExtension({
      id: 'objects',
      // Recursive over nested collections at any depth, so `object/<id>` addresses any object reachable
      // through a space's collection tree, not just the root collection's direct children. The shape is
      // data-dependent (the object's collection ancestry), so instead of a static `path` it resolves
      // dynamically: walk incoming `Collection.objects` refs up to the space root collection.
      url: {
        key: 'object',
        kind: 'item',
        path: ({ id, workspace }) =>
          Effect.gen(function* () {
            if (!SpaceId.isValid(workspace)) {
              return null;
            }
            // Look the Client up lazily (at resolve time) rather than at graph-setup time — it is not yet
            // available when the AppGraphBuilder activates, and forward resolution only runs much later.
            const client = capabilities.get(ClientCapabilities.Client);
            const space = client.spaces.get(workspace);
            if (!space) {
              return null;
            }
            const rootRef = Annotation.get(space.properties, AppAnnotation.RootCollectionAnnotation).pipe(
              Option.getOrUndefined,
            );
            if (!rootRef) {
              return null;
            }
            const rootCollection = yield* Database.load(rootRef).pipe(Effect.orElseSucceed(() => undefined));
            if (!rootCollection) {
              return null;
            }
            const chain = yield* Effect.promise(() =>
              walkCollectionChainToRoot({ space, objectId: id, rootId: rootCollection.id }),
            );
            return chain ? Paths.getCollectionsPath(workspace, ...chain, id) : null;
          }),
      },
      match: (node) => (Obj.instanceOf(Collection.Collection, node.data) ? Option.some(node.data) : Option.none()),
      connector: (collection, get) => {
        const ephemeralAtom = capabilities.get(SpaceCapabilities.EphemeralState);
        const ephemeralState = get(ephemeralAtom);
        const db = Obj.getDatabase(collection);

        const collectionSnapshot = get(Obj.atom(collection));
        const refs = collectionSnapshot.objects ?? [];

        const objects = refs
          .map((ref: any) => {
            get(Obj.atom(ref));
            return ref.target;
          })
          .filter(isNonNullable);

        return Effect.succeed(
          objects
            .map(
              (object: Obj.Unknown) =>
                db &&
                AppNode.makeObject({
                  get,
                  object,
                  db,
                  navigable: ephemeralState.navigableCollections,
                  canDrop: AppNode.CAN_DROP_COLLECTION_ITEM,
                  onRearrange: AppNode.makeCollectionRearrangeCallback(collection),
                }),
            )
            .filter(isNonNullable),
        );
      },
    }),

    // Object actions.
    GraphBuilder.createExtension({
      id: 'objectActions',
      match: (node) => {
        return node.data != null &&
          Obj.getDatabase(node.data) &&
          Obj.isObject(node.data) &&
          Obj.getTypename(node.data) === node.type
          ? Option.some({ object: node.data, nodeId: node.id })
          : Option.none();
      },
      actions: ({ object, nodeId }, get) => {
        const deletable = !Type.isType(object);

        const [appGraph] = get(capabilities.atom(AppCapabilities.AppGraph));
        const ephemeralAtom = capabilities.get(SpaceCapabilities.EphemeralState);
        const ephemeralState = get(ephemeralAtom);

        if (!appGraph) {
          return Effect.succeed([]);
        }

        const parentId = nodeId.substring(0, nodeId.lastIndexOf('/'));
        const parentNode = Option.getOrUndefined(Graph.getNode(appGraph.graph, parentId));
        const parentCollection =
          parentNode && Obj.instanceOf(Collection.Collection, parentNode.data) ? parentNode.data : undefined;

        return Effect.succeed(
          constructObjectActions({
            object,
            nodeId,
            deletable,
            navigable: ephemeralState.navigableCollections,
            shareableLinkOrigin,
            parentCollection,
          }),
        );
      },
    }),

    // Action on the collections section header to add an object to the space's root collection.
    GraphBuilder.createExtension({
      id: 'collectionsSectionActions',
      match: (node) => {
        const space = isSpace(node.properties.space) ? node.properties.space : undefined;
        return node.type === COLLECTIONS_SECTION_TYPE && space ? Option.some(space) : Option.none();
      },
      actions: (space) =>
        Effect.succeed([
          Node.makeAction({
            id: SpaceOperation.OpenCreateObject.meta.key,
            data: () =>
              Effect.gen(function* () {
                // Target the root collection so the create dialog offers collection-eligible types, like
                // any other collection; fall back to the space db if it hasn't been created yet.
                const rootCollection = Annotation.get(space.properties, AppAnnotation.RootCollectionAnnotation).pipe(
                  Option.getOrUndefined,
                )?.target;
                yield* Operation.invoke(SpaceOperation.OpenCreateObject, {
                  // Qualified id of the collections section node (root/<spaceId>/collections), so the new
                  // object's navigation path resolves under the section — the bare segment would not.
                  target: rootCollection ?? space.db,
                  targetNodeId: Paths.getCollectionsPath(space.id),
                });
              }),
            properties: {
              label: CREATE_OBJECT_IN_COLLECTION_LABEL,
              icon: 'ph--plus--regular',
              disposition: 'list-item-primary',
              testId: 'spacePlugin.createObject',
            },
          }),
        ]),
    }),
  ]);
});

//
// Helpers
//

/** Depth cap for the collection-ancestry walk; the composer nav tree is shallow, this only guards bad data. */
const COLLECTION_WALK_MAX_DEPTH = 32;

/**
 * Depth-first walk up a space's collection tree from `objectId` to the root collection, following
 * incoming `Collection.objects` references. The composer ontology guarantees a tree (an object lives in
 * one collection, no cycles), but a visited-set and depth cap keep bad data — multi-containment or a
 * cycle — from looping; the first branch that reaches the root wins. Returns the intermediate collection
 * ids in root→leaf order (excluding the root collection, whose objects sit directly under
 * `content/collections`), or null if no path to the root exists.
 */
const walkCollectionChainToRoot = async ({
  space,
  objectId,
  rootId,
}: {
  space: Space;
  objectId: string;
  rootId: string;
}): Promise<string[] | null> => {
  const visited = new Set<string>([objectId]);
  const stack: Array<{ id: string; chain: string[] }> = [{ id: objectId, chain: [] }];
  while (stack.length > 0) {
    const entry = stack.pop();
    if (!entry) {
      break;
    }
    const parents = await space.db
      .query(Query.select(Filter.id(entry.id)).referencedBy(Collection.Collection, 'objects'))
      .run();
    for (const parent of parents) {
      if (parent.id === rootId) {
        // `chain` is leaf→root as built on the way up; the node id wants root→leaf.
        return [...entry.chain].reverse();
      }
      if (visited.has(parent.id) || entry.chain.length >= COLLECTION_WALK_MAX_DEPTH) {
        continue;
      }
      visited.add(parent.id);
      stack.push({ id: parent.id, chain: [...entry.chain, parent.id] });
    }
  }
  return null;
};

/** Builds the action list for an ECHO object node. */
const constructObjectActions = ({
  object,
  nodeId,
  deletable = true,
  navigable = false,
  shareableLinkOrigin,
  parentCollection,
}: {
  object: Obj.Unknown;
  nodeId: string;
  shareableLinkOrigin: string;
  deletable?: boolean;
  navigable?: boolean;
  parentCollection?: Collection.Collection;
}) => {
  const db = Obj.getDatabase(object);
  invariant(db, 'Database not found');
  const typename = Obj.getTypename(object);
  invariant(typename, 'Object has no typename');

  const actions: Node.NodeArg<Node.ActionData<Operation.Service | Capability.Service>>[] = [
    ...(Obj.instanceOf(Collection.Collection, object)
      ? [
          Node.makeAction({
            id: SpaceOperation.OpenCreateObject.meta.key,
            data: () => Operation.invoke(SpaceOperation.OpenCreateObject, { target: object, targetNodeId: nodeId }),
            properties: {
              label: CREATE_OBJECT_IN_COLLECTION_LABEL,
              icon: 'ph--plus--regular',
              disposition: 'list-item-primary',
              testId: 'spacePlugin.createObject',
            },
          }),
        ]
      : []),
    Node.makeAction({
      id: SpaceOperation.RenameObject.meta.key,
      data: (params?: Node.InvokeProps) =>
        Operation.invoke(SpaceOperation.RenameObject, { object, caller: `${params?.caller}:${params?.parent?.id}` }),
      properties: {
        label: AppNode.getDynamicLabel('rename-object.label', typename, { defaultValue: 'Rename' }),
        icon: 'ph--pencil-simple-line--regular',
        disposition: 'list-item',
        testId: 'spacePlugin.renameObject',
      },
    }),
    Node.makeAction({
      id: SpaceOperation.RemoveObjects.meta.key,
      data: () =>
        Operation.invoke(SpaceOperation.RemoveObjects, {
          objects: [object],
          target: parentCollection,
        }),
      properties: {
        label: AppNode.getDynamicLabel('delete-object.label', typename, { defaultValue: 'Delete' }),
        icon: 'ph--trash--regular',
        disposition: 'list-item',
        disabled: !deletable,
        testId: 'spacePlugin.deleteObject',
      },
    }),
    ...(navigable || !Obj.instanceOf(Collection.Collection, object)
      ? [
          Node.makeAction({
            id: 'copyLink',
            data: () =>
              Effect.gen(function* () {
                const { builder } = yield* Capability.get(AppCapabilities.AppGraph);
                const path = Paths.getShareableLinkPath(builder, nodeId);
                if (Option.isNone(path)) {
                  log.warn('object has no URL representation; cannot copy link', { nodeId });
                  return;
                }
                const url = new URL(path.value, shareableLinkOrigin);
                yield* Effect.promise(() => navigator.clipboard.writeText(url.toString()));
              }),
            properties: {
              label: COPY_LINK_LABEL,
              icon: 'ph--link--regular',
              disposition: 'list-item',
              testId: 'spacePlugin.copyLink',
            },
          }),
        ]
      : []),
    Node.makeAction({
      id: LayoutOperation.Expose.meta.key,
      data: () => Operation.invoke(LayoutOperation.Expose, { subject: Paths.getObjectPathFromObject(object) }),
      properties: {
        label: EXPOSE_OBJECT_LABEL,
        icon: 'ph--eye--regular',
        disposition: 'heading-list-item',
        testId: 'spacePlugin.exposeObject',
      },
    }),
  ];

  return actions;
};

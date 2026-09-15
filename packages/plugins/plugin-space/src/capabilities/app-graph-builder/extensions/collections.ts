//
// Copyright 2025 DXOS.org
//

import * as Effect from 'effect/Effect';
import * as Option from 'effect/Option';

import * as Capability from '@dxos/app-framework/Capability';
import * as AppGraph from '@dxos/app-graph/AppGraph';
import * as AppGraphBuilder from '@dxos/app-graph/AppGraphBuilder';
import * as AppGraphNode from '@dxos/app-graph/AppGraphNode';
import * as AppAnnotation from '@dxos/app-toolkit/AppAnnotation';
import * as AppCapabilities from '@dxos/app-toolkit/AppCapabilities';
import * as AppNode from '@dxos/app-toolkit/AppNode';
import * as AppNodeMatcher from '@dxos/app-toolkit/AppNodeMatcher';
import * as DeckSpec from '@dxos/app-toolkit/DeckSpec';
import * as GraphPath from '@dxos/app-toolkit/GraphPath';
import * as LayoutOperation from '@dxos/app-toolkit/LayoutOperation';
import * as TypeOptions from '@dxos/app-toolkit/TypeOptions';
import * as UrlResolution from '@dxos/app-toolkit/UrlResolution';
import { isSpace } from '@dxos/client/echo';
import * as Operation from '@dxos/compute/Operation';
import { Annotation, Collection, Database, type Entity, Obj, Type } from '@dxos/echo';
import { invariant } from '@dxos/invariant';
import { SpaceId } from '@dxos/keys';
import { log } from '@dxos/log';
import * as ClientCapabilities from '@dxos/plugin-client/ClientCapabilities';
import { isNonNullable } from '@dxos/util';

import { meta } from '#meta';
import { SpaceCapabilities, SpaceOperation } from '#types';

import { resolveCollectionObjectPath } from '../../../util/index.ts';
import {
  COLLECTIONS_SECTION_TYPE,
  COPY_LINK_LABEL,
  CREATE_OBJECT_IN_COLLECTION_LABEL,
  EXPOSE_OBJECT_LABEL,
} from './shared.ts';

//
// Extension Factory
//

/** Creates collection-related extensions: collections section, collections, objects, and object actions. */

/**
 * A collection is always a navigation target; what differs is what navigating to it shows. When a
 * plugin renders collections as their own article (stack) that article wins, otherwise the deck opens
 * the collection's contents. Returning `undefined` leaves the ordinary open in place.
 */
const collectionDeck = (object: Obj.Unknown, hasCollectionArticle: boolean): DeckSpec.DeckSpec | undefined =>
  !hasCollectionArticle && Obj.instanceOf(Collection.Collection, object) ? { initial: 'children' } : undefined;

/**
 * Typenames available in this build — schemas registered by enabled plugins, plus those stored in the
 * space — so the tree can omit an object whose type has no article rather than offer a row that opens
 * nothing.
 *
 * TODO(wittjosiah): Name the plugin that would render the object instead of hiding it.
 */
const getAvailableTypenames = (types: readonly Entity.Unknown[]): ReadonlySet<string> =>
  new Set(
    types
      .filter(Type.isType)
      .map((type) => Type.getTypename(type))
      .filter(isNonNullable),
  );

const isTypeAvailable = (typenames: ReadonlySet<string>, object: Obj.Unknown): boolean => {
  const typename = Obj.getTypename(object);
  // No typename at all is not an unavailable type — leave those to the renderers.
  return !typename || typenames.has(typename);
};

export const createCollectionExtensions = Effect.fnUntraced(function* ({
  shareableLinkOrigin,
}: {
  shareableLinkOrigin: string;
}) {
  const capabilities = yield* Capability.Service;
  // Hoisted so connector/action bodies read reactively via `get(...)` instead of a sync
  // `Capability.get`, establishing a dependency that heals once the capability lands.
  const ephemeralCapAtom = yield* Capability.atom(SpaceCapabilities.EphemeralState);

  return yield* Effect.all([
    // Content section group — created alongside collections so the group always
    // appears when the space plugin is active and hides when there are no children.
    AppGraphBuilder.createExtension({
      id: GraphPath.GroupSegments.content,
      match: AppNodeMatcher.whenSpace,
      connector: (space) =>
        Effect.succeed([
          AppNode.makeGroup({
            id: GraphPath.GroupSegments.content,
            type: GraphPath.GroupTypes.content,
            label: ['nav-tree-group-content.label', { ns: meta.profile.key }],
            icon: 'ph--files--regular',
            space,
            position: 200,
          }),
        ]),
    }),

    // Collections section virtual node under the content group.
    AppGraphBuilder.createExtension({
      id: 'collectionsSection',
      match: AppNodeMatcher.whenNavTreeGroup(GraphPath.GroupTypes.content),
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
          AppGraphNode.make({
            id: GraphPath.Segments.collections,
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
    // the database subgraph addresses the same object under `db`).
    AppGraphBuilder.createExtension({
      id: 'collections',
      url: { key: 'object', kind: 'item', path: [GraphPath.GroupSegments.content, GraphPath.Segments.collections] },
      match: (node) => {
        const space = isSpace(node.properties.space) ? node.properties.space : undefined;
        return node.type === COLLECTIONS_SECTION_TYPE && space ? Option.some(space) : Option.none();
      },
      connector: (space, get) => {
        const [ephemeralAtom] = get(ephemeralCapAtom);
        if (!ephemeralAtom) {
          return Effect.succeed([]);
        }
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
        const available = getAvailableTypenames(get(space.db.query(TypeOptions.allTypesQuery).atom));

        const objects = rawRefs
          .map((ref: any) => {
            get(Obj.atom(ref));
            return ref.target;
          })
          .filter(isNonNullable)
          .filter((object: Obj.Unknown) => isTypeAvailable(available, object));

        return Effect.succeed(
          objects
            .map((object: Obj.Unknown) =>
              AppNode.makeObject({
                get,
                db: space.db,
                object,
                navigable: true,
                deck: collectionDeck(object, ephemeralState.navigableCollections),
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
    AppGraphBuilder.createExtension({
      id: 'objects',
      // Recursive over nested collections at any depth, so `object/<id>` addresses any object reachable
      // through a space's collection tree, not just the root collection's direct children. The shape is
      // data-dependent (the object's collection ancestry), so instead of a static `path` it resolves
      // dynamically — see `resolveCollectionObjectPath`.
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
            const path = yield* resolveCollectionObjectPath({ objectId: id }).pipe(
              Effect.provide(Database.layer(space.db)),
            );
            return path ?? null;
          }),
      },
      match: (node) => (Obj.instanceOf(Collection.Collection, node.data) ? Option.some(node.data) : Option.none()),
      connector: (collection, get) => {
        const [ephemeralAtom] = get(ephemeralCapAtom);
        if (!ephemeralAtom) {
          return Effect.succeed([]);
        }
        const ephemeralState = get(ephemeralAtom);
        const db = Obj.getDatabase(collection);

        const collectionSnapshot = get(Obj.atom(collection));
        const refs = collectionSnapshot.objects ?? [];
        const available = db ? getAvailableTypenames(get(db.query(TypeOptions.allTypesQuery).atom)) : undefined;

        const objects = refs
          .map((ref: any) => {
            get(Obj.atom(ref));
            return ref.target;
          })
          .filter(isNonNullable)
          .filter((object: Obj.Unknown) => !available || isTypeAvailable(available, object));

        return Effect.succeed(
          objects
            .map(
              (object: Obj.Unknown) =>
                db &&
                AppNode.makeObject({
                  get,
                  object,
                  db,
                  navigable: true,
                  deck: collectionDeck(object, ephemeralState.navigableCollections),
                  canDrop: AppNode.CAN_DROP_COLLECTION_ITEM,
                  onRearrange: AppNode.makeCollectionRearrangeCallback(collection),
                }),
            )
            .filter(isNonNullable),
        );
      },
    }),

    // Object actions.
    AppGraphBuilder.createExtension({
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
        const [ephemeralAtom] = get(ephemeralCapAtom);

        if (!appGraph || !ephemeralAtom) {
          return Effect.succeed([]);
        }
        const ephemeralState = get(ephemeralAtom);

        const parentId = nodeId.substring(0, nodeId.lastIndexOf('/'));
        const parentNode = Option.getOrUndefined(AppGraph.getNode(appGraph.graph, parentId));
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
    AppGraphBuilder.createExtension({
      id: 'collectionsSectionActions',
      match: (node) => {
        const space = isSpace(node.properties.space) ? node.properties.space : undefined;
        return node.type === COLLECTIONS_SECTION_TYPE && space ? Option.some(space) : Option.none();
      },
      actions: (space) =>
        Effect.succeed([
          AppGraphNode.makeAction({
            id: SpaceOperation.OpenObjectForm.meta.key,
            data: () =>
              Effect.gen(function* () {
                // Target the root collection so the create dialog offers collection-eligible types, like
                // any other collection; fall back to the space db if it hasn't been created yet.
                const rootCollection = Annotation.get(space.properties, AppAnnotation.RootCollectionAnnotation).pipe(
                  Option.getOrUndefined,
                )?.target;
                yield* Operation.invoke(SpaceOperation.OpenObjectForm, {
                  // Qualified id of the collections section node (root/<spaceId>/collections), so the new
                  // object's navigation path resolves under the section — the bare segment would not.
                  target: rootCollection ?? space.db,
                  targetNodeId: GraphPath.getCollectionsPath(space.id),
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

  const actions: AppGraphNode.NodeArg<AppGraphNode.ActionData<Operation.Service | Capability.Service>>[] = [
    ...(Obj.instanceOf(Collection.Collection, object)
      ? [
          AppGraphNode.makeAction({
            id: SpaceOperation.OpenObjectForm.meta.key,
            data: () => Operation.invoke(SpaceOperation.OpenObjectForm, { target: object, targetNodeId: nodeId }),
            properties: {
              label: CREATE_OBJECT_IN_COLLECTION_LABEL,
              icon: 'ph--plus--regular',
              disposition: 'list-item-primary',
              testId: 'spacePlugin.createObject',
            },
          }),
        ]
      : []),
    AppGraphNode.makeAction({
      id: SpaceOperation.RenameObject.meta.key,
      data: (params?: AppGraphNode.InvokeProps) =>
        Operation.invoke(SpaceOperation.RenameObject, { object, caller: `${params?.caller}:${params?.parent?.id}` }),
      properties: {
        label: AppNode.getDynamicLabel('rename-object.label', typename, { defaultValue: 'Rename' }),
        icon: 'ph--pencil-simple-line--regular',
        disposition: 'list-item',
        testId: 'spacePlugin.renameObject',
      },
    }),
    AppGraphNode.makeAction({
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
          AppGraphNode.makeAction({
            id: 'copyLink',
            data: () =>
              Effect.gen(function* () {
                const builder = yield* Capability.get(AppCapabilities.AppGraph);
                const path = UrlResolution.getShareableLinkPath(builder, nodeId);
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
    AppGraphNode.makeAction({
      id: LayoutOperation.Expose.meta.key,
      data: () => Operation.invoke(LayoutOperation.Expose, { subject: GraphPath.getObjectPathFromObject(object) }),
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

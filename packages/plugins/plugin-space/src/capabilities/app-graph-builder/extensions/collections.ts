//
// Copyright 2025 DXOS.org
//

import * as Effect from 'effect/Effect';
import * as Option from 'effect/Option';

import * as Capability from '@dxos/app-framework/Capability';
import * as AppGraphBuilder from '@dxos/app-graph/AppGraphBuilder';
import * as AppGraphNode from '@dxos/app-graph/AppGraphNode';
import * as AppAnnotation from '@dxos/app-toolkit/AppAnnotation';
import * as AppCapabilities from '@dxos/app-toolkit/AppCapabilities';
import * as AppNode from '@dxos/app-toolkit/AppNode';
import * as AppNodeMatcher from '@dxos/app-toolkit/AppNodeMatcher';
import * as CollectionOperation from '@dxos/app-toolkit/CollectionOperation';
import * as ContainerModel from '@dxos/app-toolkit/ContainerModel';
import * as DeckSpec from '@dxos/app-toolkit/DeckSpec';
import * as GraphPath from '@dxos/app-toolkit/GraphPath';
import * as LayoutOperation from '@dxos/app-toolkit/LayoutOperation';
import * as NavigationOperation from '@dxos/app-toolkit/NavigationOperation';
import * as TypeOptions from '@dxos/app-toolkit/TypeOptions';
import * as UrlResolution from '@dxos/app-toolkit/UrlResolution';
import { isSpace } from '@dxos/client/echo';
import * as Operation from '@dxos/compute/Operation';
import { Annotation, Collection, Database, type Entity, Filter, Obj, Query, Type } from '@dxos/echo';
import { invariant } from '@dxos/invariant';
import { SpaceId } from '@dxos/keys';
import { log } from '@dxos/log';
import * as ClientCapabilities from '@dxos/plugin-client/ClientCapabilities';
import { ArchivedAnnotation, isArchivable } from '@dxos/schema';
import { isNonNullable } from '@dxos/util';

import { meta } from '#meta';
import { SpaceCapabilities, SpaceOperation } from '#types';

import { resolveCollectionObjectPath } from '../../../util/index.ts';
import {
  ADD_TO_COLLECTION_LABEL,
  ARCHIVE_OBJECT_LABEL,
  COLLECTIONS_SECTION_TYPE,
  COPY_LINK_LABEL,
  CREATE_OBJECT_IN_COLLECTION_LABEL,
  EXPOSE_OBJECT_LABEL,
  REMOVE_FROM_COLLECTION_LABEL,
  SHOW_ORIGINAL_LABEL,
  UNARCHIVE_OBJECT_LABEL,
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
          ? AppNode.getListPartials(ContainerModel.collection(rootCollection), space.db)
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

        const available = getAvailableTypenames(get(space.db.query(TypeOptions.allTypesQuery).atom));
        const objects = get(
          space.db.query(
            Query.select(Filter.entity(collection))
              .reference('objects')
              .select(Filter.not(Filter.annotation(ArchivedAnnotation, true))),
          ).atom,
        ).filter((object: Obj.Unknown) => isTypeAvailable(available, object));

        return Effect.succeed(
          objects
            .map((object: Obj.Unknown) =>
              AppNode.makeObject({
                get,
                db: space.db,
                object,
                navigable: true,
                deck: collectionDeck(object, ephemeralState.navigableCollections),
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
      // data-dependent (the object's collection ancestry), so the id is the object's own segment and
      // `resolve` finds the rest — see `resolveCollectionObjectPath`.
      url: {
        key: 'object',
        kind: 'item',
        path: [GraphPath.GroupSegments.content, GraphPath.Segments.collections],
        resolve: ({ id, workspace }) =>
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

        const available = db ? getAvailableTypenames(get(db.query(TypeOptions.allTypesQuery).atom)) : undefined;
        const members = db
          ? get(
              db.query(
                Query.select(Filter.entity(collection))
                  .reference('objects')
                  .select(Filter.not(Filter.annotation(ArchivedAnnotation, true))),
              ).atom,
            )
          : [];
        const objects = members.filter((object: Obj.Unknown) => !available || isTypeAvailable(available, object));

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
        const container = AppNode.getListOf(Option.getOrUndefined(get(appGraph.graph.node(parentId))));

        return Effect.succeed(
          constructObjectActions({
            object,
            nodeId,
            deletable,
            navigable: ephemeralState.navigableCollections,
            shareableLinkOrigin,
            container,
            parent: container ? get(Obj.parentAtom(object)) : undefined,
            archived: isArchivable(object)
              ? Option.getOrElse(get(Annotation.atom(object, ArchivedAnnotation)), () => false)
              : undefined,
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
  container,
  parent,
  archived,
}: {
  object: Obj.Unknown;
  nodeId: string;
  shareableLinkOrigin: string;
  deletable?: boolean;
  navigable?: boolean;
  container?: ContainerModel.Container;
  parent?: Obj.Unknown;
  /** Current archive state; undefined when the object's type is not archivable. */
  archived?: boolean;
}) => {
  const db = Obj.getDatabase(object);
  invariant(db, 'Database not found');
  const typename = Obj.getTypename(object);
  invariant(typename, 'Object has no typename');
  const linkedFrom = container && ContainerModel.isLink(container, parent) ? container : undefined;
  const parentCollection =
    container && Obj.instanceOf(Collection.Collection, container.object) ? container.object : undefined;

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
    ...(container
      ? [
          AppGraphNode.makeAction({
            id: 'removeFromContainer',
            data: () => Effect.sync(() => ContainerModel.release({ container, object })),
            properties: {
              label: container.removeLabel ?? REMOVE_FROM_COLLECTION_LABEL,
              icon: 'ph--minus-circle--regular',
              disposition: 'list-item',
              testId: 'spacePlugin.removeFromContainer',
            },
          }),
        ]
      : []),
    ...(linkedFrom
      ? [
          AppGraphNode.makeAction({
            id: 'showOriginal',
            data: () =>
              Effect.gen(function* () {
                const { targets } = yield* Operation.invoke(NavigationOperation.ResolveNavigationTargets, {
                  query: { uri: Obj.getURI(object) },
                });
                const target = targets[0];
                if (target) {
                  yield* Operation.invoke(LayoutOperation.Open, { subject: [target.path], navigation: 'immediate' });
                }
              }),
            properties: {
              label: SHOW_ORIGINAL_LABEL,
              icon: 'ph--arrow-square-out--regular',
              disposition: 'list-item',
              testId: 'spacePlugin.showOriginal',
            },
          }),
        ]
      : [
          AppGraphNode.makeAction({
            id: SpaceOperation.RemoveObjects.meta.key,
            data: () =>
              Operation.invoke(
                SpaceOperation.RemoveObjects,
                { objects: [object], target: parentCollection },
                { spaceId: Obj.getDatabase(object)?.spaceId },
              ),
            properties: {
              label: AppNode.getDynamicLabel('delete-object.label', typename, { defaultValue: 'Delete' }),
              icon: 'ph--trash--regular',
              disposition: 'list-item',
              disabled: !deletable,
              testId: 'spacePlugin.deleteObject',
            },
          }),
        ]),
    ...(TypeOptions.isUserObject(object)
      ? [
          AppGraphNode.makeAction({
            id: CollectionOperation.OpenAddToCollection.meta.key,
            data: () => Operation.invoke(CollectionOperation.OpenAddToCollection, { object }),
            properties: {
              label: ADD_TO_COLLECTION_LABEL,
              icon: CollectionOperation.OpenAddToCollection.meta.icon,
              disposition: 'list-item',
              testId: 'spacePlugin.addToCollection',
            },
          }),
        ]
      : []),
    ...(archived !== undefined
      ? [
          AppGraphNode.makeAction({
            id: SpaceOperation.SetArchived.meta.key,
            data: () => Operation.invoke(SpaceOperation.SetArchived, { objects: [object], archived: !archived }),
            properties: {
              label: archived ? UNARCHIVE_OBJECT_LABEL : ARCHIVE_OBJECT_LABEL,
              icon: archived ? 'ph--tray-arrow-up--regular' : 'ph--archive--regular',
              disposition: 'list-item',
              testId: archived ? 'spacePlugin.unarchiveObject' : 'spacePlugin.archiveObject',
            },
          }),
        ]
      : []),
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

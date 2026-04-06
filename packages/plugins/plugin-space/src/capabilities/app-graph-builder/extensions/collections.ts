//
// Copyright 2025 DXOS.org
//

import * as Effect from 'effect/Effect';
import * as Option from 'effect/Option';

import { Capabilities, Capability } from '@dxos/app-framework';
import { AppCapabilities, LayoutOperation, Segments, getObjectPathFromObject } from '@dxos/app-toolkit';
import { SpaceState, getSpace, isSpace } from '@dxos/client/echo';
import { Collection, Obj, Type } from '@dxos/echo';
import { AtomObj } from '@dxos/echo-atom';
import { invariant } from '@dxos/invariant';
import { Operation } from '@dxos/operation';
import { CreateAtom, Graph, GraphBuilder, Node } from '@dxos/plugin-graph';
import { isNonNullable } from '@dxos/util';

import { meta } from '../../../meta';
import { SpaceCapabilities } from '#types';
import { SpaceOperation } from '#operations';

import {
  COLLECTIONS_SECTION_TYPE,
  COPY_LINK_LABEL,
  CREATE_OBJECT_IN_COLLECTION_LABEL,
  EXPOSE_OBJECT_LABEL,
  type MetadataResolver,
  REMOVE_FROM_COLLECTION_LABEL,
  createObjectNode,
  getCollectionGraphNodePartials,
  getDynamicLabel,
  whenSpace,
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

  const resolve = (get: any) => (typename: string) =>
    capabilities.getAll(AppCapabilities.Metadata).find(({ id }) => id === typename)?.metadata ?? {};

  return yield* Effect.all([
    // Collections section virtual node under each space.
    GraphBuilder.createExtension({
      id: `${meta.id}.collections-section`,
      match: whenSpace,
      connector: (space, get) => {
        const spaceState = get(CreateAtom.fromObservable(space.state));
        if (spaceState !== SpaceState.SPACE_READY) {
          return Effect.succeed([]);
        }

        const propertiesSnapshot = get(AtomObj.make(space.properties));
        const collectionRef = propertiesSnapshot[Collection.Collection.typename] as any;
        if (collectionRef) {
          get(AtomObj.make(collectionRef));
        }
        const rootCollection = collectionRef?.target;
        const collectionPartials = rootCollection
          ? getCollectionGraphNodePartials({ collection: rootCollection, db: space.db, resolve: resolve(get) })
          : undefined;

        return Effect.succeed([
          {
            id: Segments.collections,
            type: COLLECTIONS_SECTION_TYPE,
            data: null,
            properties: {
              label: ['collections-section.label', { ns: meta.id }],
              icon: 'ph--folder--regular',
              iconHue: 'neutral',
              role: 'branch',
              position: 'hoist',
              testId: 'spacePlugin.collectionsSection',
              draggable: false,
              droppable: false,
              space,
              ...collectionPartials,
            },
          },
        ]);
      },
    }),

    // Root collection objects under the Collections virtual node.
    GraphBuilder.createExtension({
      id: `${meta.id}.collections`,
      match: (node) => {
        const space = isSpace(node.properties.space) ? node.properties.space : undefined;
        return node.type === COLLECTIONS_SECTION_TYPE && space ? Option.some(space) : Option.none();
      },
      connector: (space, get) => {
        const ephemeralAtom = capabilities.get(SpaceCapabilities.EphemeralState);
        const ephemeralState = get(ephemeralAtom);

        const propertiesSnapshot = get(AtomObj.make(space.properties));
        const collectionRef = propertiesSnapshot[Collection.Collection.typename] as any;
        const collection = collectionRef ? get(AtomObj.make(collectionRef)) : undefined;
        if (!collection) {
          return Effect.succeed([]);
        }

        const rawRefs = collection.objects ?? [];

        const objects = rawRefs
          .map((ref: any) => {
            get(AtomObj.make(ref));
            return ref.target;
          })
          .filter(isNonNullable);

        return Effect.succeed(
          objects
            .map((object: Obj.Unknown) =>
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

    // Children of Collection.Collection nodes.
    GraphBuilder.createExtension({
      id: `${meta.id}.objects`,
      match: (node) => (Obj.instanceOf(Collection.Collection, node.data) ? Option.some(node.data) : Option.none()),
      connector: (collection, get) => {
        const ephemeralAtom = capabilities.get(SpaceCapabilities.EphemeralState);
        const ephemeralState = get(ephemeralAtom);
        const space = getSpace(collection);

        const collectionSnapshot = get(AtomObj.make(collection));
        const refs = collectionSnapshot.objects ?? [];

        const objects = refs
          .map((ref: any) => {
            get(AtomObj.make(ref));
            return ref.target;
          })
          .filter(isNonNullable);

        return Effect.succeed(
          objects
            .map(
              (object: Obj.Unknown) =>
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
      // TODO(graph-path-ids): Resolver temporarily disabled; redesign needed for path-based IDs.
      // resolver: (id, get) => { ... },
    }),

    // Object actions.
    GraphBuilder.createExtension({
      id: `${meta.id}.object-actions`,
      match: (node) => {
        const space = getSpace(node.data);
        return space && Obj.isObject(node.data) && Obj.getTypename(node.data) === node.type
          ? Option.some({ space, object: node.data, nodeId: node.id })
          : Option.none();
      },
      actions: ({ space, object, nodeId }, get) => {
        const deletable = !Obj.instanceOf(Type.PersistentType, object);

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
            resolve: resolve(get),
            deletable,
            navigable: ephemeralState.navigableCollections,
            shareableLinkOrigin,
            parentCollection,
          }),
        );
      },
    }),
  ]);
});

//
// Helpers
//

/** Builds the action list for an ECHO object node. */
const constructObjectActions = ({
  object,
  nodeId,
  resolve,
  deletable = true,
  navigable = false,
  shareableLinkOrigin,
  parentCollection,
}: {
  object: Obj.Unknown;
  nodeId: string;
  resolve: MetadataResolver;
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
          {
            id: SpaceOperation.OpenCreateObject.meta.key,
            type: Node.ActionType,
            data: () => Operation.invoke(SpaceOperation.OpenCreateObject, { target: object, targetNodeId: nodeId }),
            properties: {
              label: CREATE_OBJECT_IN_COLLECTION_LABEL,
              icon: 'ph--plus--regular',
              disposition: 'list-item-primary',
              testId: 'spacePlugin.createObject',
            },
          },
        ]
      : []),
    {
      id: SpaceOperation.RenameObject.meta.key,
      type: Node.ActionType,
      data: (params?: Node.InvokeProps) =>
        Operation.invoke(SpaceOperation.RenameObject, { object, caller: `${params?.caller}:${params?.parent?.id}` }),
      properties: {
        label: getDynamicLabel('rename object label', typename, { defaultValue: 'Rename' }),
        icon: 'ph--pencil-simple-line--regular',
        disposition: 'list-item',
        testId: 'spacePlugin.renameObject',
      },
    },
    ...(parentCollection && !Obj.instanceOf(Collection.Collection, object)
      ? [
          {
            id: 'remove-from-collection',
            type: Node.ActionType,
            data: () =>
              Effect.gen(function* () {
                const index = parentCollection.objects.findIndex((ref: any) => ref.target === object);
                if (index !== -1) {
                  const layout = yield* Capabilities.getAtomValue(AppCapabilities.Layout);
                  const isActive = layout.active.includes(nodeId);

                  Obj.change(parentCollection, (mutable) => {
                    mutable.objects.splice(index, 1);
                  });

                  if (isActive) {
                    yield* Operation.invoke(LayoutOperation.Open, {
                      subject: [getObjectPathFromObject(object)],
                    });
                  }
                }
              }),
            properties: {
              label: REMOVE_FROM_COLLECTION_LABEL,
              icon: 'ph--minus-circle--regular',
              disposition: 'list-item',
              testId: 'spacePlugin.removeFromCollection',
            },
          },
        ]
      : []),
    {
      id: SpaceOperation.RemoveObjects.meta.key,
      type: Node.ActionType,
      data: () =>
        Operation.invoke(SpaceOperation.RemoveObjects, {
          objects: [object],
          target: parentCollection,
        }),
      properties: {
        label: getDynamicLabel('delete object label', typename, { defaultValue: 'Delete' }),
        icon: 'ph--trash--regular',
        disposition: 'list-item',
        disabled: !deletable,
        testId: 'spacePlugin.deleteObject',
      },
    },
    ...(navigable || !Obj.instanceOf(Collection.Collection, object)
      ? [
          {
            id: 'copy-link',
            type: Node.ActionType,
            data: () =>
              Effect.promise(async () => {
                const url = `${shareableLinkOrigin}/${db.spaceId}/${Obj.getDXN(object).toString()}`;
                await navigator.clipboard.writeText(url);
              }),
            properties: {
              label: COPY_LINK_LABEL,
              icon: 'ph--link--regular',
              disposition: 'list-item',
              testId: 'spacePlugin.copyLink',
            },
          },
        ]
      : []),
    {
      id: LayoutOperation.Expose.meta.key,
      type: Node.ActionType,
      data: () => Operation.invoke(LayoutOperation.Expose, { subject: getObjectPathFromObject(object) }),
      properties: {
        label: EXPOSE_OBJECT_LABEL,
        icon: 'ph--eye--regular',
        disposition: 'heading-list-item',
        testId: 'spacePlugin.exposeObject',
      },
    },
  ];

  return actions;
};

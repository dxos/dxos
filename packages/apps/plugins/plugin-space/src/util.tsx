//
// Copyright 2023 DXOS.org
//

import {
  Database,
  FloppyDisk,
  FolderOpen,
  type IconProps,
  PencilSimpleLine,
  Planet,
  Plus,
  Trash,
  Users,
  X,
  ClockCounterClockwise,
} from '@phosphor-icons/react';
import { CardsThree } from '@phosphor-icons/react';
import { batch, effect } from '@preact/signals-core';
import React from 'react';

import { actionGroupSymbol, type InvokeParams, type Graph, type Node, manageNodes } from '@braneframe/plugin-graph';
import { CanvasType, cloneObject, CollectionType, TextType } from '@braneframe/types';
import { NavigationAction, type IntentDispatcher, type MetadataResolver } from '@dxos/app-framework';
import { type UnsubscribeCallback } from '@dxos/async';
import { type EchoReactiveObject, isReactiveObject, Expando } from '@dxos/echo-schema';
import { create } from '@dxos/echo-schema';
import { Migrations } from '@dxos/migrations';
import { SpaceState, getSpace, type Space, Filter, isEchoObject, fullyQualifiedId } from '@dxos/react-client/echo';
import { nonNullable } from '@dxos/util';

import { SPACE_PLUGIN } from './meta';
import { SpaceAction } from './types';

export const SHARED = 'shared-spaces';
export const HIDDEN = 'hidden-spaces';

export const getSpaceDisplayName = (space: Space): string | [string, { ns: string }] => {
  return space.state.get() === SpaceState.READY && (space.properties.name?.length ?? 0) > 0
    ? space.properties.name
    : space.state.get() === SpaceState.CLOSED || space.state.get() === SpaceState.INACTIVE
      ? ['closed space label', { ns: SPACE_PLUGIN }]
      : space.state.get() !== SpaceState.READY
        ? ['loading space label', { ns: SPACE_PLUGIN }]
        : ['unnamed space label', { ns: SPACE_PLUGIN }];
};

const getCollectionGraphNodePartials = ({
  graph,
  collection,
  space,
}: {
  graph: Graph;
  collection: CollectionType;
  space: Space;
}) => {
  return {
    acceptPersistenceClass: new Set(['echo']),
    acceptPersistenceKey: new Set([space.id]),
    role: 'branch',
    onRearrangeChildren: (nextOrder: unknown[]) => {
      // Change on disk.
      collection.objects = nextOrder.filter(isEchoObject);
    },
    onTransferStart: (child: Node<EchoReactiveObject<any>>) => {
      // TODO(wittjosiah): Support transfer between spaces.
      // const childSpace = getSpace(child.data);
      // if (space && childSpace && !childSpace.key.equals(space.key)) {
      //   // Create clone of child and add to destination space.
      //   const newObject = clone(child.data, {
      //     // TODO(wittjosiah): This needs to be generalized and not hardcoded here.
      //     additional: [
      //       child.data.content,
      //       ...(child.data.objects ?? []),
      //       ...(child.data.objects ?? []).map((object: TypedObject) => object.content),
      //     ],
      //   });
      //   space.db.add(newObject);
      //   collection.objects.push(newObject);
      // } else {

      // Add child to destination collection.
      if (!collection.objects.includes(child.data)) {
        collection.objects.push(child.data);
      }

      // }
    },
    onTransferEnd: (child: Node<EchoReactiveObject<any>>, destination: Node) => {
      // Remove child from origin collection.
      const index = collection.objects.indexOf(child.data);
      if (index > -1) {
        collection.objects.splice(index, 1);
      }

      // TODO(wittjosiah): Support transfer between spaces.
      // const childSpace = getSpace(child.data);
      // const destinationSpace =
      //   destination.data instanceof SpaceProxy ? destination.data : getSpace(destination.data);
      // if (destinationSpace && childSpace && !childSpace.key.equals(destinationSpace.key)) {
      //   // Mark child as deleted in origin space.
      //   childSpace.db.remove(child.data);
      // }
    },
    onCopy: async (child: Node<EchoReactiveObject<any>>) => {
      // Create clone of child and add to destination space.
      const newObject = await cloneObject(child.data);
      space.db.add(newObject);
      collection.objects.push(newObject);
    },
  };
};

export const updateGraphWithSpace = ({
  graph,
  space,
  enabled,
  hidden,
  isPersonalSpace,
  dispatch,
  resolve,
}: {
  graph: Graph;
  space: Space;
  enabled?: boolean;
  hidden?: boolean;
  isPersonalSpace?: boolean;
  dispatch: IntentDispatcher;
  resolve: MetadataResolver;
}): UnsubscribeCallback => {
  const getId = (id: string) => `${id}/${space.id}`;

  const unsubscribeSpace = effect(() => {
    const hasPendingMigration =
      space.state.get() === SpaceState.READY &&
      !!Migrations.versionProperty &&
      space.properties[Migrations.versionProperty] !== Migrations.targetVersion;
    const collection = space.state.get() === SpaceState.READY && space.properties[CollectionType.typename];
    const partials =
      space.state.get() === SpaceState.READY && collection instanceof CollectionType
        ? getCollectionGraphNodePartials({ graph, collection, space })
        : {};

    batch(() => {
      manageNodes({
        graph,
        condition: hidden ? true : space.state.get() !== SpaceState.INACTIVE,
        removeEdges: true,
        nodes: [
          {
            id: space.id,
            data: space,
            properties: {
              ...partials,
              label: isPersonalSpace ? ['personal space label', { ns: SPACE_PLUGIN }] : getSpaceDisplayName(space),
              description: space.state.get() === SpaceState.READY && space.properties.description,
              icon: (props: IconProps) => <Planet {...props} />,
              disabled: space.state.get() !== SpaceState.READY || hasPendingMigration,
              // TODO(burdon): Change to semantic classes that are customizable.
              palette: isPersonalSpace ? 'teal' : undefined,
              testId: isPersonalSpace ? 'spacePlugin.personalSpace' : 'spacePlugin.space',
            },
            edges: [[isPersonalSpace ? 'root' : SHARED, 'inbound']],
          },
        ],
      });

      manageNodes({
        graph,
        condition: !enabled,
        removeEdges: true,
        nodes: [
          {
            id: getId(SpaceAction.ENABLE),
            data: () => dispatch({ plugin: SPACE_PLUGIN, action: SpaceAction.ENABLE, data: { space } }),
            properties: {
              disposition: 'default',
              hidden: true,
            },
            edges: [[space.id, 'inbound']],
          },
        ],
      });

      manageNodes({
        graph,
        condition: space.state.get() === SpaceState.READY && !hasPendingMigration,
        removeEdges: true,
        nodes: [
          {
            id: getId(SpaceAction.ADD_OBJECT),
            data: actionGroupSymbol,
            properties: {
              label: ['create object group label', { ns: SPACE_PLUGIN }],
              icon: (props: IconProps) => <Plus {...props} />,
              disposition: 'toolbar',
              // TODO(wittjosiah): This is currently a navtree feature. Address this with cmd+k integration.
              // mainAreaDisposition: 'in-flow',
              menuType: 'searchList',
              testId: 'spacePlugin.createObject',
            },
            edges: [[space.id, 'inbound']],
          },
        ],
      });

      manageNodes({
        graph,
        condition: space.state.get() === SpaceState.READY && !hasPendingMigration,
        removeEdges: true,
        nodes: [
          {
            id: getId(SpaceAction.ADD_OBJECT.replace('object', 'collection')),
            data: () =>
              dispatch([
                {
                  plugin: SPACE_PLUGIN,
                  action: SpaceAction.ADD_OBJECT,
                  data: { target: collection, object: create(CollectionType, { objects: [], views: {} }) },
                },
                {
                  action: NavigationAction.OPEN,
                },
              ]),
            properties: {
              label: ['create collection label', { ns: SPACE_PLUGIN }],
              icon: (props: IconProps) => <CardsThree {...props} />,
              testId: 'spacePlugin.createCollection',
            },
            edges: [[getId(SpaceAction.ADD_OBJECT), 'inbound']],
          },
        ],
      });

      manageNodes({
        graph,
        condition: hasPendingMigration,
        removeEdges: true,
        nodes: [
          {
            id: getId(SpaceAction.MIGRATE),
            data: () => dispatch({ plugin: SPACE_PLUGIN, action: SpaceAction.MIGRATE, data: { space } }),
            properties: {
              label: ['migrate space label', { ns: SPACE_PLUGIN }],
              icon: (props: IconProps) => <Database {...props} />,
              disposition: 'toolbar',
              mainAreaDisposition: 'in-flow',
              disabled: Migrations.running(space),
            },
            edges: [[space.id, 'inbound']],
          },
        ],
      });

      manageNodes({
        graph,
        condition: !isPersonalSpace && space.state.get() === SpaceState.READY && !hasPendingMigration,
        removeEdges: true,
        nodes: [
          {
            id: getId(SpaceAction.RENAME),
            data: (params: InvokeParams) =>
              dispatch({ plugin: SPACE_PLUGIN, action: SpaceAction.RENAME, data: { space, ...params } }),
            properties: {
              label: ['rename space label', { ns: SPACE_PLUGIN }],
              icon: (props: IconProps) => <PencilSimpleLine {...props} />,
              keyBinding: {
                macos: 'shift+F6',
                windows: 'shift+F6',
              },
              mainAreaDisposition: 'absent',
            },
            edges: [[space.id, 'inbound']],
          },
          {
            id: getId(SpaceAction.SHARE),
            data: () => dispatch({ plugin: SPACE_PLUGIN, action: SpaceAction.SHARE, data: { spaceId: space.id } }),
            properties: {
              label: ['share space', { ns: SPACE_PLUGIN }],
              icon: (props) => <Users {...props} />,
              keyBinding: {
                macos: 'meta+.',
                windows: 'alt+.',
              },
              mainAreaDisposition: 'absent',
            },
            edges: [[space.id, 'inbound']],
          },
          {
            id: getId(SpaceAction.CLOSE),
            data: () => dispatch({ plugin: SPACE_PLUGIN, action: SpaceAction.CLOSE, data: { space } }),
            properties: {
              label: ['close space label', { ns: SPACE_PLUGIN }],
              icon: (props: IconProps) => <X {...props} />,
              mainAreaDisposition: 'menu',
            },
            edges: [[space.id, 'inbound']],
          },
          {
            id: getId(SpaceAction.SAVE),
            data: () => dispatch({ plugin: SPACE_PLUGIN, action: SpaceAction.SAVE, data: { space } }),
            properties: {
              label: ['save space to disk label', { ns: SPACE_PLUGIN }],
              icon: (props: IconProps) => <FloppyDisk {...props} />,
              keyBinding: {
                macos: 'meta+s',
                windows: 'ctrl+s',
              },
              mainAreaDisposition: 'in-flow',
            },
            edges: [[space.id, 'inbound']],
          },
          {
            id: getId(SpaceAction.LOAD),
            data: () => dispatch({ plugin: SPACE_PLUGIN, action: SpaceAction.LOAD, data: { space } }),
            properties: {
              label: ['load space from disk label', { ns: SPACE_PLUGIN }],
              icon: (props: IconProps) => <FolderOpen {...props} />,
              keyBinding: {
                macos: 'meta+shift+l',
                windows: 'ctrl+shift+l',
              },
              mainAreaDisposition: 'in-flow',
            },
            edges: [[space.id, 'inbound']],
          },
        ],
      });

      manageNodes({
        graph,
        condition: space.state.get() === SpaceState.INACTIVE,
        removeEdges: true,
        nodes: [
          {
            id: getId(SpaceAction.OPEN),
            data: () => dispatch({ plugin: SPACE_PLUGIN, action: SpaceAction.OPEN, data: { space } }),
            properties: {
              label: ['open space label', { ns: SPACE_PLUGIN }],
              icon: (props: IconProps) => <ClockCounterClockwise {...props} />,
              disposition: 'toolbar',
              mainAreaDisposition: 'in-flow',
            },
            edges: [[space.id, 'inbound']],
          },
        ],
      });
    });
  });

  const unsubscribeQuery = enabled ? updateGraphWithSpaceObjects({ graph, space, dispatch }) : undefined;

  return () => {
    unsubscribeSpace();
    unsubscribeQuery?.();
  };
};

// Update graph with all objects in the space.
const updateGraphWithSpaceObjects = ({
  graph,
  space,
  dispatch,
}: {
  graph: Graph;
  space: Space;
  dispatch: IntentDispatcher;
}) => {
  // TODO(wittjosiah): Space plugin should not be aware of these types.
  const query = space.db.query(
    Filter.not(Filter.or(Filter.schema(TextType), Filter.schema(CanvasType), Filter.schema(Expando))),
  );
  const previousObjects = new Map<string, EchoReactiveObject<any>[]>();
  const unsubscribeQuery = query.subscribe();

  const unsubscribeQueryHandler = effect(() => {
    const collection =
      space.state.get() === SpaceState.READY ? (space.properties[CollectionType.typename] as CollectionType) : null;
    const collectionObjects = collection?.objects ?? [];
    const removedObjects =
      previousObjects
        .get(space.id)
        ?.filter((object) => !(query.objects as EchoReactiveObject<any>[]).includes(object)) ?? [];
    previousObjects.set(space.id, [...query.objects]);
    const unsortedObjects = query.objects.filter((object) => !collectionObjects.includes(object));
    const objects = [...collectionObjects, ...unsortedObjects].filter((object) => object !== collection);

    batch(() => {
      // Cleanup when objects removed from space.
      removedObjects.filter(nonNullable).forEach((object) => {
        const getId = (id?: string) => (id ? `${id}/${fullyQualifiedId(object)}` : fullyQualifiedId(object));
        if (object instanceof CollectionType) {
          graph.removeNode(getId());
          graph.removeNode(getId(SpaceAction.ADD_OBJECT));
          graph.removeNode(getId(SpaceAction.ADD_OBJECT.replace('object', 'collection')));
        }
        graph.removeEdge({ source: space.id, target: getId() });
        [SpaceAction.RENAME_OBJECT, SpaceAction.REMOVE_OBJECT].forEach((action) => {
          graph.removeNode(getId(action));
        });
      });

      objects.filter(nonNullable).forEach((object) => {
        const getId = (id?: string) => (id ? `${id}/${fullyQualifiedId(object)}` : fullyQualifiedId(object));

        // When object is a collection but not the root collection.
        if (object instanceof CollectionType && collection && object !== collection) {
          const partials = getCollectionGraphNodePartials({ graph, collection: object, space });

          graph.addNodes({
            id: getId(),
            data: object,
            properties: {
              ...partials,
              label: object.name ||
                // TODO(wittjosiah): This is here for backwards compatibility.
                (object as any).title || ['unnamed collection label', { ns: SPACE_PLUGIN }],
              icon: (props: IconProps) => <CardsThree {...props} />,
              testId: 'spacePlugin.object',
              persistenceClass: 'echo',
              persistenceKey: space.id,
            },
          });

          const removedObjects = previousObjects.get(object.id)?.filter((o) => !object.objects.includes(o)) ?? [];
          // TODO(wittjosiah): Not speading here results in empty array being stored.
          previousObjects.set(object.id, [...object.objects.filter(nonNullable)]);

          // Remove objects no longer in collection.
          removedObjects.forEach((child) => graph.removeEdge({ source: getId(), target: fullyQualifiedId(child) }));

          // Add new objects to collection.
          object.objects
            .filter(nonNullable)
            .forEach((child) => graph.addEdge({ source: getId(), target: fullyQualifiedId(child) }));

          // Set order of objects in collection.
          graph.sortEdges(
            getId(),
            'outbound',
            object.objects.filter(nonNullable).map((o) => fullyQualifiedId(o)),
          );

          graph.addNodes({
            id: getId(SpaceAction.ADD_OBJECT),
            data: actionGroupSymbol,
            properties: {
              label: ['create object group label', { ns: SPACE_PLUGIN }],
              icon: (props: IconProps) => <Plus {...props} />,
              disposition: 'toolbar',
              // TODO(wittjosiah): This is currently a navtree feature. Address this with cmd+k integration.
              // mainAreaDisposition: 'in-flow',
              menuType: 'searchList',
              testId: 'spacePlugin.createObject',
            },
            edges: [[getId(), 'inbound']],
          });

          graph.addNodes({
            id: getId(SpaceAction.ADD_OBJECT.replace('object', 'collection')),
            data: () =>
              dispatch([
                {
                  plugin: SPACE_PLUGIN,
                  action: SpaceAction.ADD_OBJECT,
                  data: { target: object, object: create(CollectionType, { objects: [], views: {} }) },
                },
                {
                  action: NavigationAction.OPEN,
                },
              ]),
            properties: {
              label: ['create collection label', { ns: SPACE_PLUGIN }],
              icon: (props: IconProps) => <CardsThree {...props} />,
              testId: 'spacePlugin.createCollection',
            },
            edges: [[getId(SpaceAction.ADD_OBJECT), 'inbound']],
          });
        }

        // Add an edge for every object. Depends on other presentation plugins to add the node itself.
        graph.addEdge({ source: space.id, target: getId() });

        // Add basic rename and delete actions to every object.
        // TODO(wittjosiah): Rename should be customizable.
        //  Probably done by popping open create dialog (https://github.com/dxos/dxos/issues/5191).
        graph.addNodes(
          {
            id: getId(SpaceAction.RENAME_OBJECT),
            data: (params: InvokeParams) =>
              dispatch({
                action: SpaceAction.RENAME_OBJECT,
                data: { object, ...params },
              }),
            properties: {
              label: [
                object instanceof CollectionType ? 'rename collection label' : 'rename object label',
                { ns: SPACE_PLUGIN },
              ],
              icon: (props: IconProps) => <PencilSimpleLine {...props} />,
              // TODO(wittjosiah): Doesn't work.
              // keyBinding: 'shift+F6',
              testId: 'spacePlugin.renameObject',
            },
            edges: [[getId(), 'inbound']],
          },
          {
            id: getId(SpaceAction.REMOVE_OBJECT),
            data: ({ node, caller }) => {
              const collection = node
                .nodes({ direction: 'inbound' })
                .find(({ data }) => data instanceof CollectionType)?.data;
              return dispatch([
                {
                  action: SpaceAction.REMOVE_OBJECT,
                  data: { object, collection, caller },
                },
              ]);
            },
            properties: {
              label: [
                object instanceof CollectionType ? 'delete collection label' : 'delete object label',
                { ns: SPACE_PLUGIN },
              ],
              icon: (props) => <Trash {...props} />,
              keyBinding: object instanceof CollectionType ? undefined : 'shift+meta+Backspace',
              testId: 'spacePlugin.deleteObject',
            },
            edges: [[getId(), 'inbound']],
          },
        );
      });

      // Set order of objects in space.
      graph.sortEdges(
        space.id,
        'outbound',
        collectionObjects.filter(nonNullable).map((o) => fullyQualifiedId(o)),
      );
    });
  });

  return () => {
    unsubscribeQuery();
    unsubscribeQueryHandler();
  };
};

/**
 * Adds an action for creating a specific object type to a space and all its collections.
 *
 * @returns Unsubscribe callback.
 */
// TODO(wittjosiah): Consider ways to make this helper not necessary.
//   Could there be a special node in the graph which actions get added to and
//   the navtree applies them to all collection nodes?
export const updateGraphWithAddObjectAction = ({
  graph,
  space,
  plugin,
  action,
  properties,
  condition = true,
  dispatch,
}: {
  graph: Graph;
  space: Space;
  plugin: string;
  action: string;
  properties: Record<string, any>;
  condition?: boolean;
  dispatch: IntentDispatcher;
}) => {
  // Include the create document action on all collections.
  const collectionQuery = space.db.query(Filter.schema(CollectionType));
  let previousCollections: CollectionType[] = [];
  const unsubscribeQuery = collectionQuery.subscribe();
  const unsubscribeQueryHandler = effect(() => {
    const removedCollections = previousCollections.filter(
      (collection) => !collectionQuery.objects.includes(collection),
    );
    previousCollections = collectionQuery.objects;

    batch(() => {
      // Include the create document action on all spaces.
      manageNodes({
        graph,
        condition: space.state.get() === SpaceState.READY && condition,
        nodes: [
          {
            id: `${plugin}/create/${space.id}`,
            data: () =>
              dispatch([
                {
                  plugin,
                  action,
                },
                {
                  action: SpaceAction.ADD_OBJECT,
                  data: { target: space },
                },
                {
                  action: NavigationAction.OPEN,
                },
              ]),
            properties,
            edges: [[`${SpaceAction.ADD_OBJECT}/${space.id}`, 'inbound']],
          },
        ],
      });

      if (condition) {
        removedCollections.forEach((collection) => {
          graph.removeNode(`${plugin}/create/${collection.id}`, true);
        });
        collectionQuery.objects.forEach((collection) => {
          graph.addNodes({
            id: `${plugin}/create/${collection.id}`,
            data: () =>
              dispatch([
                {
                  plugin,
                  action,
                },
                {
                  action: SpaceAction.ADD_OBJECT,
                  data: { target: collection },
                },
                {
                  action: NavigationAction.OPEN,
                },
              ]),
            properties,
            edges: [[`${SpaceAction.ADD_OBJECT}/${fullyQualifiedId(collection)}`, 'inbound']],
          });
        });
      }
    });
  });

  return () => {
    unsubscribeQueryHandler();
    unsubscribeQuery();
  };
};

/**
 * @deprecated
 */
export const getActiveSpace = (graph: Graph, active?: string) => {
  if (!active) {
    return;
  }

  const node = graph.findNode(active);
  if (!node || !isReactiveObject(node.data)) {
    return;
  }

  return getSpace(node.data);
};

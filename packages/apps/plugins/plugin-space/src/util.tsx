//
// Copyright 2023 DXOS.org
//

import {
  Database,
  FloppyDisk,
  FolderOpen,
  FolderPlus,
  type IconProps,
  PencilSimpleLine,
  Planet,
  Plus,
  Trash,
  Users,
  X,
  ClockCounterClockwise,
} from '@phosphor-icons/react';
import { batch, effect } from '@preact/signals-core';
import React from 'react';

import { getSpaceProperty } from '@braneframe/plugin-client';
import { actionGroupSymbol, type InvokeParams, type Graph, type Node, manageNodes } from '@braneframe/plugin-graph';
import { FolderType } from '@braneframe/types';
import { NavigationAction, type IntentDispatcher, type MetadataResolver } from '@dxos/app-framework';
import { type UnsubscribeCallback } from '@dxos/async';
import * as E from '@dxos/echo-schema';
import {
  EchoDatabaseImpl,
  Filter,
  LEGACY_TEXT_TYPE,
  type OpaqueEchoObject,
  type EchoReactiveObject,
} from '@dxos/echo-schema';
import { PublicKey } from '@dxos/keys';
import { Migrations } from '@dxos/migrations';
import { SpaceState, getSpace, type Space } from '@dxos/react-client/echo';
import { nonNullable } from '@dxos/util';

import { SPACE_PLUGIN } from './meta';
import { clone } from './serializer';
import { SpaceAction } from './types';

export const SHARED = 'shared-spaces';
export const HIDDEN = 'hidden-spaces';

export const isSpace = (data: unknown): data is Space =>
  data && typeof data === 'object'
    ? 'key' in data && data.key instanceof PublicKey && 'db' in data && data.db instanceof EchoDatabaseImpl // TODO(dmaretskyi): No doing duck typing.
    : false;

export const getSpaceDisplayName = (space: Space): string | [string, { ns: string }] => {
  return space.state.get() === SpaceState.READY && (space.properties.name?.length ?? 0) > 0
    ? space.properties.name
    : space.state.get() === SpaceState.CLOSED || space.state.get() === SpaceState.INACTIVE
      ? ['closed space label', { ns: SPACE_PLUGIN }]
      : space.state.get() !== SpaceState.READY
        ? ['loading space label', { ns: SPACE_PLUGIN }]
        : ['unnamed space label', { ns: SPACE_PLUGIN }];
};

const getFolderGraphNodePartials = ({ graph, folder, space }: { graph: Graph; folder: FolderType; space: Space }) => {
  return {
    acceptPersistenceClass: new Set(['echo']),
    acceptPersistenceKey: new Set([space.key.toHex()]),
    role: 'branch',
    onRearrangeChildren: (nextOrder: unknown[]) => {
      // Change on disk.
      folder.objects = nextOrder.filter(E.isEchoReactiveObject);
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
      //   folder.objects.push(newObject);
      // } else {

      // Add child to destination folder.
      folder.objects.push(child.data);

      // }
    },
    onTransferEnd: (child: Node<EchoReactiveObject<any>>, destination: Node) => {
      // Remove child from origin folder.
      const index = folder.objects.indexOf(child.data);
      if (index > -1) {
        folder.objects.splice(index, 1);
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
      const newObject = await clone(child.data);
      space.db.add(newObject);
      folder.objects.push(newObject);
    },
  };
};

export const updateGraphWithSpace = ({
  graph,
  space,
  hidden,
  isPersonalSpace,
  dispatch,
  resolve,
}: {
  graph: Graph;
  space: Space;
  hidden?: boolean;
  isPersonalSpace?: boolean;
  dispatch: IntentDispatcher;
  resolve: MetadataResolver;
}): UnsubscribeCallback => {
  const getId = (id: string) => `${id}/${space.key.toHex()}`;

  const unsubscribeSpace = effect(() => {
    const folder = space.state.get() === SpaceState.READY && getSpaceProperty(space, FolderType.typename);
    const partials =
      space.state.get() === SpaceState.READY && folder instanceof FolderType
        ? getFolderGraphNodePartials({ graph, folder, space })
        : {};

    batch(() => {
      manageNodes({
        graph,
        condition: hidden ? true : space.state.get() !== SpaceState.INACTIVE,
        removeEdges: true,
        nodes: [
          {
            id: space.key.toHex(),
            data: space,
            properties: {
              ...partials,
              label: isPersonalSpace ? ['personal space label', { ns: SPACE_PLUGIN }] : getSpaceDisplayName(space),
              description: space.state.get() === SpaceState.READY && space.properties.description,
              icon: (props: IconProps) => <Planet {...props} />,
              disabled: space.state.get() === SpaceState.INACTIVE,
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
        condition: folder instanceof FolderType && (hidden ? true : space.state.get() === SpaceState.READY),
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
            edges: [[space.key.toHex(), 'inbound']],
          },
        ],
      });

      manageNodes({
        graph,
        condition: folder instanceof FolderType && (hidden ? true : space.state.get() === SpaceState.READY),
        removeEdges: true,
        nodes: [
          {
            id: getId(SpaceAction.ADD_OBJECT.replace('object', 'folder')),
            data: () =>
              dispatch({
                plugin: SPACE_PLUGIN,
                action: SpaceAction.ADD_OBJECT,
                data: { target: folder, object: E.object(FolderType, { objects: [] }) },
              }),
            properties: {
              label: ['create folder label', { ns: SPACE_PLUGIN }],
              icon: (props: IconProps) => <FolderPlus {...props} />,
              testId: 'spacePlugin.createFolder',
            },
            edges: [[getId(SpaceAction.ADD_OBJECT), 'inbound']],
          },
        ],
      });

      manageNodes({
        graph,
        condition:
          space.state.get() === SpaceState.READY &&
          typeof Migrations.versionProperty === 'string' &&
          getSpaceProperty(space, Migrations.versionProperty) !== Migrations.targetVersion,
        removeEdges: true,
        nodes: [
          {
            id: getId(SpaceAction.MIGRATE),
            data: () => dispatch({ plugin: SPACE_PLUGIN, action: SpaceAction.MIGRATE, data: { space } }),
            properties: {
              label: ['migrate space label', { ns: SPACE_PLUGIN }],
              icon: (props: IconProps) => <Database {...props} />,
              mainAreaDisposition: 'in-flow',
            },
            edges: [[space.key.toHex(), 'inbound']],
          },
        ],
      });

      manageNodes({
        graph,
        condition: !isPersonalSpace && space.state.get() === SpaceState.READY,
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
            edges: [[space.key.toHex(), 'inbound']],
          },
          {
            id: getId(SpaceAction.SHARE),
            data: () =>
              dispatch({ plugin: SPACE_PLUGIN, action: SpaceAction.SHARE, data: { spaceKey: space.key.toHex() } }),
            properties: {
              label: ['share space', { ns: SPACE_PLUGIN }],
              icon: (props) => <Users {...props} />,
              keyBinding: {
                macos: 'meta+.',
                windows: 'alt+.',
              },
              mainAreaDisposition: 'absent',
            },
            edges: [[space.key.toHex(), 'inbound']],
          },
          {
            id: getId(SpaceAction.CLOSE),
            data: () => dispatch({ plugin: SPACE_PLUGIN, action: SpaceAction.CLOSE, data: { space } }),
            properties: {
              label: ['close space label', { ns: SPACE_PLUGIN }],
              icon: (props: IconProps) => <X {...props} />,
              mainAreaDisposition: 'menu',
            },
            edges: [[space.key.toHex(), 'inbound']],
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
            edges: [[space.key.toHex(), 'inbound']],
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
            edges: [[space.key.toHex(), 'inbound']],
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
            edges: [[space.key.toHex(), 'inbound']],
          },
        ],
      });
    });
  });

  // Update graph with all objects in the space.
  // TODO(wittjosiah): If text objects are included in this query then it updates on every keystroke in the editor.
  const query = space.db.query((obj: OpaqueEchoObject) => {
    if (E.typeOf(obj)?.itemId === LEGACY_TEXT_TYPE) {
      return false;
    }

    return true;
  });
  const previousObjects = new Map<string, EchoReactiveObject<any>[]>();
  const unsubscribeQuery = effect(() => {
    const folder =
      space.state.get() === SpaceState.READY ? getSpaceProperty<FolderType>(space, FolderType.typename) : null;
    const folderObjects = folder?.objects ?? [];
    const removedObjects =
      previousObjects
        .get(space.key.toHex())
        ?.filter((object) => !(query.objects as EchoReactiveObject<any>[]).includes(object)) ?? [];
    previousObjects.set(space.key.toHex(), [...query.objects]);
    const unsortedObjects = query.objects.filter((object) => !folderObjects.includes(object));
    const objects = [...folderObjects, ...unsortedObjects].filter((object) => object !== folder);

    batch(() => {
      // Cleanup when objects removed from space.
      removedObjects.filter(nonNullable).forEach((object) => {
        const getId = (id: string) => `${id}/${object.id}`;
        if (object instanceof FolderType) {
          graph.removeNode(object.id);
          graph.removeNode(getId(SpaceAction.ADD_OBJECT));
          graph.removeNode(getId(SpaceAction.ADD_OBJECT.replace('object', 'folder')));
        }
        graph.removeEdge({ source: space.key.toHex(), target: object.id });
        [SpaceAction.RENAME_OBJECT, SpaceAction.REMOVE_OBJECT].forEach((action) => {
          graph.removeNode(getId(action));
        });
      });

      objects.filter(nonNullable).forEach((object) => {
        const getId = (id: string) => `${id}/${object.id}`;

        // When object is a folder but not the root folder.
        // TODO(wittjosiah): Not adding nodes for any folders until the root folder is available.
        //  Not clear why it it's not immediately available.
        if (object instanceof FolderType && folder && object !== folder) {
          const partials = getFolderGraphNodePartials({ graph, folder: object, space });

          graph.addNodes({
            id: object.id,
            data: object,
            properties: {
              ...partials,
              label: object.name ||
                // TODO(wittjosiah): This is here for backwards compatibility.
                (object as any).title || ['unnamed folder label', { ns: SPACE_PLUGIN }],
              icon: (props: IconProps) => <FolderOpen {...props} />,
              testId: 'spacePlugin.object',
              persistenceClass: 'echo',
              persistenceKey: space.key.toHex(),
            },
          });

          const removedObjects = previousObjects.get(object.id)?.filter((o) => !object.objects.includes(o)) ?? [];
          // TODO(wittjosiah): Not speading here results in empty array being stored.
          previousObjects.set(object.id, [...object.objects.filter(nonNullable)]);

          // Remove objects no longer in folder.
          removedObjects.forEach((child) => graph.removeEdge({ source: object.id, target: child.id }));

          // Add new objects to folder.
          object.objects.filter(nonNullable).forEach((child) => graph.addEdge({ source: object.id, target: child.id }));

          // Set order of objects in folder.
          graph.sortEdges(
            object.id,
            'outbound',
            object.objects.filter(nonNullable).map((o) => o.id),
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
            edges: [[object.id, 'inbound']],
          });

          graph.addNodes({
            id: getId(SpaceAction.ADD_OBJECT.replace('object', 'folder')),
            data: () =>
              dispatch({
                plugin: SPACE_PLUGIN,
                action: SpaceAction.ADD_OBJECT,
                data: { target: folder, object: E.object(FolderType, { objects: [] }) },
              }),
            properties: {
              label: ['create folder label', { ns: SPACE_PLUGIN }],
              icon: (props: IconProps) => <FolderPlus {...props} />,
              testId: 'spacePlugin.createFolder',
            },
            edges: [[getId(SpaceAction.ADD_OBJECT), 'inbound']],
          });
        }

        // Add an edge for every object. Depends on other presentation plugins to add the node itself.
        graph.addEdge({ source: space.key.toHex(), target: object.id });

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
                object instanceof FolderType ? 'rename folder label' : 'rename object label',
                { ns: SPACE_PLUGIN },
              ],
              icon: (props: IconProps) => <PencilSimpleLine {...props} />,
              // TODO(wittjosiah): Doesn't work.
              // keyBinding: 'shift+F6',
              testId: 'spacePlugin.renameObject',
            },
            edges: [[object.id, 'inbound']],
          },
          {
            id: getId(SpaceAction.REMOVE_OBJECT),
            data: ({ node, caller }) => {
              const folder = node.nodes({ direction: 'inbound' }).find(({ data }) => data instanceof FolderType);
              return dispatch([
                {
                  action: SpaceAction.REMOVE_OBJECT,
                  data: { object, folder, caller },
                },
              ]);
            },
            properties: {
              label: [
                object instanceof FolderType ? 'delete folder label' : 'delete object label',
                { ns: SPACE_PLUGIN },
              ],
              icon: (props) => <Trash {...props} />,
              keyBinding: object instanceof FolderType ? undefined : 'shift+meta+Backspace',
              testId: 'spacePlugin.deleteObject',
            },
            edges: [[object.id, 'inbound']],
          },
        );
      });

      // Set order of objects in space.
      graph.sortEdges(
        space.key.toHex(),
        'outbound',
        folderObjects.filter(nonNullable).map((o) => o.id),
      );
    });
  });

  return () => {
    unsubscribeSpace();
    unsubscribeQuery();
  };
};

/**
 * Adds an action for creating a specific object type to a space and all its folders.
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
  // Include the create document action on all folders.
  const folderQuery = space.db.query(Filter.schema(FolderType));
  let previousFolders: FolderType[] = [];
  return effect(() => {
    const removedFolders = previousFolders.filter((folder) => !folderQuery.objects.includes(folder));
    previousFolders = folderQuery.objects;

    batch(() => {
      // Include the create document action on all spaces.
      manageNodes({
        graph,
        condition: space.state.get() === SpaceState.READY && condition,
        nodes: [
          {
            id: `${plugin}/create/${space.key.toHex()}`,
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
                  action: NavigationAction.ACTIVATE,
                },
              ]),
            properties,
            edges: [[`${SpaceAction.ADD_OBJECT}/${space.key.toHex()}`, 'inbound']],
          },
        ],
      });

      removedFolders.forEach((folder) => {
        graph.removeNode(`${plugin}/create/${folder.id}`, true);
      });
      folderQuery.objects.forEach((folder) => {
        graph.addNodes({
          id: `${plugin}/create/${folder.id}`,
          data: () =>
            dispatch([
              {
                plugin,
                action,
              },
              {
                action: SpaceAction.ADD_OBJECT,
                data: { target: folder },
              },
              {
                action: NavigationAction.ACTIVATE,
              },
            ]),
          properties,
          edges: [[`${SpaceAction.ADD_OBJECT}/${folder.id}`, 'inbound']],
        });
      });
    });
  });
};

/**
 * @deprecated
 */
export const getActiveSpace = (graph: Graph, active?: string) => {
  if (!active) {
    return;
  }

  const node = graph.findNode(active);
  if (!node || !E.isEchoReactiveObject(node.data)) {
    return;
  }

  return getSpace(node.data);
};

export const prepareSpaceForMigration = (space: Space) => {
  // migrations class doesn't know about key splitting using (get|set)SpaceProperty functions
  // ensure the version set using keySplitting is accessible without key splitting
  if (Migrations.namespace && !space.properties[Migrations.namespace]) {
    space.properties[Migrations.namespace] = getSpaceProperty(space, Migrations.namespace);
  }
};

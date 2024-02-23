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
  Placeholder,
  Planet,
  Plus,
  Trash,
  Users,
  X,
  ClockCounterClockwise,
} from '@phosphor-icons/react';
import { effect } from '@preact/signals-core';
import React from 'react';

import {
  actionGroupSymbol,
  type InvokeParams,
  type Graph,
  type Node,
  type NodeArg,
  manageNodes,
} from '@braneframe/plugin-graph';
import { Folder } from '@braneframe/types';
import { type IntentDispatcher, type MetadataResolver } from '@dxos/app-framework';
import { type UnsubscribeCallback } from '@dxos/async';
import { EchoDatabaseImpl, isTypedObject } from '@dxos/echo-schema';
import { PublicKey } from '@dxos/keys';
import { Migrations } from '@dxos/migrations';
import { SpaceState, getSpaceForObject, type Space, type TypedObject } from '@dxos/react-client/echo';

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
  return (space.properties.name?.length ?? 0) > 0
    ? space.properties.name
    : space.state.get() === SpaceState.CLOSED || space.state.get() === SpaceState.INACTIVE
      ? ['closed space label', { ns: SPACE_PLUGIN }]
      : space.state.get() !== SpaceState.READY
        ? ['loading space label', { ns: SPACE_PLUGIN }]
        : ['unnamed space label', { ns: SPACE_PLUGIN }];
};

const getFolderGraphNodePartials = ({
  folder,
  space,
  dispatch,
}: {
  folder: Folder;
  space: Space;
  dispatch: IntentDispatcher;
}): Partial<NodeArg<null>> => {
  return {
    data: null,
    properties: {
      acceptPersistenceClass: new Set(['echo']),
      acceptPersistenceKey: new Set([space.key.toHex()]),
      role: 'branch',
      onRearrangeChildren: (nextOrder: TypedObject[]) => {
        folder.objects = nextOrder;
      },
      onTransferStart: (child: Node<TypedObject>) => {
        // TODO(wittjosiah): Support transfer between spaces.
        // const childSpace = getSpaceForObject(child.data);
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
      onTransferEnd: (child: Node<TypedObject>, destination: Node) => {
        // Remove child from origin folder.
        const index = folder.objects.indexOf(child.data);
        if (index > -1) {
          folder.objects.splice(index, 1);
        }

        // TODO(wittjosiah): Support transfer between spaces.
        // const childSpace = getSpaceForObject(child.data);
        // const destinationSpace =
        //   destination.data instanceof SpaceProxy ? destination.data : getSpaceForObject(destination.data);
        // if (destinationSpace && childSpace && !childSpace.key.equals(destinationSpace.key)) {
        //   // Mark child as deleted in origin space.
        //   childSpace.db.remove(child.data);
        // }
      },
      onCopy: async (child: Node<TypedObject>) => {
        // Create clone of child and add to destination space.
        const newObject = await clone(child.data);
        space.db.add(newObject);
        folder.objects.push(newObject);
      },
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
  const query = space.db.query();
  let previousObjects: TypedObject[] = [];
  return effect(() => {
    const folder = space.properties[Folder.schema.typename];
    // TODO(wittjosiah): Nested action nodes from partials won't be removed by manageNodes.
    const partials =
      space.state.get() === SpaceState.READY && folder instanceof Folder
        ? getFolderGraphNodePartials({ folder, space, dispatch })
        : {};

    manageNodes({
      graph,
      condition: hidden ? space.state.get() !== SpaceState.INACTIVE : true,
      removeEdges: true,
      nodes: [
        {
          ...partials,
          id: space.key.toHex(),
          data: space,
          properties: {
            ...partials.properties,
            label: isPersonalSpace ? ['personal space label', { ns: SPACE_PLUGIN }] : getSpaceDisplayName(space),
            description: space.properties.description,
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
      condition: hidden ? space.state.get() !== SpaceState.INACTIVE : true,
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
      condition: hidden ? space.state.get() !== SpaceState.INACTIVE : true,
      removeEdges: true,
      nodes: [
        {
          id: getId(SpaceAction.ADD_OBJECT.replace('object', 'folder')),
          data: () =>
            dispatch({
              plugin: SPACE_PLUGIN,
              action: SpaceAction.ADD_OBJECT,
              data: { target: folder, object: new Folder() },
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
        space.properties[Migrations.versionProperty] !== Migrations.targetVersion,
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
            keyBinding: 'shift+F6',
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
            keyBinding: 'meta+.',
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
            keyBinding: 'meta+s',
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
            keyBinding: 'meta+shift+l',
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

    // if (!(folder instanceof Folder)) {
    //   return;
    // }

    // const childSubscriptions = new EventSubscriptions();
    // const removedObjects = previousObjects.filter((object) => !folder.objects.includes(object));
    // previousObjects = folder.objects;

    // removedObjects.forEach((object) => parent.removeNode(object.id));
    // folder.objects.forEach((object) => {
    //   if (!object) {
    //     return;
    //   }

    //   const unsubscribe = objectToGraphNode({ object, parent: node, dispatch, resolve });
    //   if (unsubscribe) {
    //     childSubscriptions.add(unsubscribe);
    //   }
    // });

    // return () => childSubscriptions.clear();

    const removedObjects = previousObjects.filter((object) => !query.objects.includes(object));
    previousObjects = query.objects;

    removedObjects.forEach((object) => {
      const getId = (id: string) => `${id}/${object.id}`;
      graph.removeEdge(space.key.toHex(), object.id);
      [SpaceAction.RENAME_OBJECT, SpaceAction.REMOVE_OBJECT].forEach((action) => {
        graph.removeNode(getId(action));
      });
    });
    query.objects.forEach((object) => {
      const getId = (id: string) => `${id}/${object.id}`;

      graph.addEdge(space.key.toHex(), object.id);
      graph.addNodes(
        {
          id: getId(SpaceAction.RENAME_OBJECT),
          data: (params: InvokeParams) =>
            dispatch({
              action: SpaceAction.RENAME_OBJECT,
              data: { object, ...params },
            }),
          properties: {
            label: ['rename object label', { ns: SPACE_PLUGIN }],
            icon: (props: IconProps) => <PencilSimpleLine {...props} />,
            keyBinding: 'shift+F6',
            testId: 'spacePlugin.renameObject',
          },
          edges: [[object.id, 'inbound']],
        },
        {
          id: getId(SpaceAction.REMOVE_OBJECT),
          data: ({ node, caller }) => {
            const folder = node.nodes({ direction: 'inbound' }).find(({ data }) => data instanceof Folder);
            return dispatch([
              {
                action: SpaceAction.REMOVE_OBJECT,
                data: { object, folder, caller },
              },
            ]);
          },
          properties: {
            label: ['delete object label', { ns: SPACE_PLUGIN }],
            icon: (props) => <Trash {...props} />,
            keyBinding: 'shift+meta+Backspace',
            testId: 'spacePlugin.deleteObject',
          },
          edges: [[object.id, 'inbound']],
        },
      );
    });
  });
};

export const objectToGraphNode = ({
  graph,
  object,
  dispatch,
  resolve,
}: {
  graph: Graph;
  object: TypedObject;
  dispatch: IntentDispatcher;
  resolve: MetadataResolver;
}): UnsubscribeCallback => {
  const getId = (id: string) => `${id}/${object.id}`;
  const space = getSpaceForObject(object);
  const metadata = object.__typename ? resolve(object.__typename) : object.type ? resolve(object.type) : {};
  const partials =
    space && object instanceof Folder ? getFolderGraphNodePartials({ folder: object, space, dispatch }) : {};

  // let previousObjects: TypedObject[] = [];
  return effect(() => {
    // TODO(wittjosiah): Remove from graph condition?
    graph.addNodes({
      id: object.id,
      data: object,
      ...partials,
      properties: {
        ...partials.properties,
        label: object.name || object.title || metadata.placeholder || ['unnamed object label', { ns: SPACE_PLUGIN }],
        description: object.description,
        icon: metadata.icon ?? ((props: IconProps) => <Placeholder {...props} />),
        testId: 'spacePlugin.object',
        persistenceClass: 'echo',
        persistenceKey: space?.key.toHex(),
      },
    });

    // TODO(wittjosiah): Nest above?
    graph.addNodes(
      {
        id: getId(SpaceAction.RENAME_OBJECT),
        data: (params: InvokeParams) =>
          dispatch({
            action: SpaceAction.RENAME_OBJECT,
            data: { object, ...params },
          }),
        properties: {
          label: ['rename object label', { ns: SPACE_PLUGIN }],
          icon: (props: IconProps) => <PencilSimpleLine {...props} />,
          keyBinding: 'shift+F6',
          testId: 'spacePlugin.renameObject',
        },
      },
      {
        id: getId(SpaceAction.REMOVE_OBJECT),
        data: (params) =>
          dispatch([
            {
              action: SpaceAction.REMOVE_OBJECT,
              // TODO(wittjosiah): Parent.
              data: { object, /* folder: parent.data, */ ...params },
            },
          ]),
        properties: {
          label: ['delete object label', { ns: SPACE_PLUGIN }],
          icon: (props) => <Trash {...props} />,
          keyBinding: 'shift+meta+Backspace',
          testId: 'spacePlugin.deleteObject',
        },
      },
    );

    // if (!(object instanceof Folder)) {
    //   node.addAction({
    //     id: 'duplicate',
    //     label: ['duplicate object label', { ns: SPACE_PLUGIN }],
    //     icon: (props) => <Copy {...props} />,
    //     invoke: () =>
    //       dispatch({
    //         action: SpaceAction.DUPLICATE_OBJECT,
    //         data: { object, target: parent.data },
    //       }),
    //     properties: {
    //       testId: 'spacePlugin.duplicateObject',
    //     },
    //   });

    //   return;
    // }

    // const folder = object;
    // const childSubscriptions = new EventSubscriptions();
    // const removedObjects = previousObjects.filter((object) => !folder.objects.includes(object));
    // previousObjects = folder.objects;

    // removedObjects.forEach((object) => parent.removeNode(object.id));
    // folder.objects.forEach((object) => {
    //   if (!object) {
    //     return;
    //   }

    //   const unsubscribe = objectToGraphNode({ object, parent: node, dispatch, resolve });
    //   if (unsubscribe) {
    //     childSubscriptions.add(unsubscribe);
    //   }
    // });

    // return () => childSubscriptions.clear();
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
  if (!node || !isTypedObject(node.data)) {
    return;
  }

  return getSpaceForObject(node.data);
};

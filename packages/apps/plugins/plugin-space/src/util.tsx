//
// Copyright 2023 DXOS.org
//

import {
  ClockCounterClockwise,
  Download,
  FolderPlus,
  PencilSimpleLine,
  Planet,
  Plus,
  Placeholder,
  Trash,
  Users,
  Upload,
  X,
  Database,
} from '@phosphor-icons/react';
import { effect } from '@preact/signals-react';
import React from 'react';

import type { Graph, Node, NodeArg } from '@braneframe/plugin-graph';
import { Folder } from '@braneframe/types';
import { type DispatchIntent, type MetadataResolver } from '@dxos/app-framework';
import { EventSubscriptions, type UnsubscribeCallback } from '@dxos/async';
import { clone } from '@dxos/echo-schema';
import { PublicKey } from '@dxos/keys';
import { Migrations } from '@dxos/migrations';
import {
  EchoDatabase,
  type Space,
  SpaceState,
  TypedObject,
  getSpaceForObject,
  SpaceProxy,
} from '@dxos/react-client/echo';

import { SPACE_PLUGIN } from './meta';
import { SpaceAction } from './types';

export const SHARED = 'shared-spaces';
export const HIDDEN = 'hidden-spaces';

export const isSpace = (data: unknown): data is Space =>
  data && typeof data === 'object'
    ? 'key' in data && data.key instanceof PublicKey && 'db' in data && data.db instanceof EchoDatabase
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
  dispatch: DispatchIntent;
}): Partial<NodeArg> => {
  return {
    actions: [
      {
        id: `${SPACE_PLUGIN}/create`,
        label: ['create object group label', { ns: SPACE_PLUGIN }],
        icon: (props) => <Plus {...props} />,
        keyBinding: 'ctrl+n', // TODO(burdon): Not working since invoke is no-op.
        invoke: () => {
          // No-op.
        },
        actions: [
          {
            id: 'folder/create',
            label: ['create folder label', { ns: SPACE_PLUGIN }],
            icon: (props) => <FolderPlus {...props} />,
            invoke: () =>
              dispatch({
                plugin: SPACE_PLUGIN,
                action: SpaceAction.ADD_OBJECT,
                data: { target: folder, object: new Folder() },
              }),
          },
        ],
        properties: {
          disposition: 'toolbar',
          menuType: 'searchList',
          testId: 'spacePlugin.createObject',
        },
      },
    ],
    properties: {
      acceptPersistenceClass: new Set(['folder']),
      role: 'branch',
      onRearrangeChildren: (nextOrder: TypedObject[]) => {
        folder.objects = nextOrder;
      },
      onTransferStart: (child: Node<TypedObject>) => {
        const childSpace = getSpaceForObject(child.data);
        if (space && childSpace && !childSpace.key.equals(space.key)) {
          // Create clone of child and add to destination space.
          const newObject = clone(child.data, {
            retainId: true,
            // TODO(wittjosiah): This needs to be generalized and not hardcoded here.
            additional: [
              child.data.content,
              ...(child.data.objects ?? []),
              ...(child.data.objects ?? []).map((object: TypedObject) => object.content),
            ],
          });
          space.db.add(newObject);
          folder.objects.push(newObject);
        } else {
          // Add child to destination folder.
          folder.objects.push(child.data);
        }
      },
      onTransferEnd: (child: Node<TypedObject>, destination: Node) => {
        // Remove child from origin folder.
        const index = folder.objects.indexOf(child.data);
        if (index > -1) {
          folder.objects.splice(index, 1);
        }

        const childSpace = getSpaceForObject(child.data);
        const destinationSpace =
          destination.data instanceof SpaceProxy ? destination.data : getSpaceForObject(destination.data);
        if (destinationSpace && childSpace && !childSpace.key.equals(destinationSpace.key)) {
          // Mark child as deleted in origin space.
          childSpace.db.remove(child.data);
        }
      },
    },
  };
};

export const spaceToGraphNode = ({
  space,
  parent,
  hidden,
  version,
  dispatch,
  resolve,
}: {
  space: Space;
  parent: Node;
  hidden?: boolean;
  version?: string;
  dispatch: DispatchIntent;
  resolve: MetadataResolver;
}): UnsubscribeCallback => {
  let previousObjects: TypedObject[] = [];
  return effect(() => {
    if (space.state.get() === SpaceState.INACTIVE && !hidden) {
      parent.removeNode(space.key.toHex());
      return;
    }

    const isPersonalSpace = parent.id === 'root';
    const folder = space.properties[Folder.schema.typename];
    const partials =
      space.state.get() === SpaceState.READY && folder instanceof Folder
        ? getFolderGraphNodePartials({ folder, space, dispatch })
        : {};

    const [node] = parent.addNode(SPACE_PLUGIN, {
      id: space.key.toHex(),
      label: isPersonalSpace ? ['personal space label', { ns: SPACE_PLUGIN }] : getSpaceDisplayName(space),
      description: space.properties.description,
      icon: (props) => <Planet {...props} />,
      data: space,
      ...partials,
      properties: {
        ...partials.properties,
        disabled: space.state.get() === SpaceState.INACTIVE,
        // TODO(burdon): Change to semantic classes that are customizable.
        palette: isPersonalSpace ? 'teal' : undefined,
        testId: isPersonalSpace ? 'spacePlugin.personalSpace' : 'spacePlugin.space',
      },
    });

    if (
      space.state.get() === SpaceState.READY &&
      Migrations.versionProperty &&
      space.properties[Migrations.versionProperty] !== version
    ) {
      node.addAction({
        id: 'migrate-space',
        label: ['migrate space label', { ns: SPACE_PLUGIN }],
        icon: (props) => <Database {...props} />,
        invoke: () => dispatch({ plugin: SPACE_PLUGIN, action: SpaceAction.MIGRATE, data: { space } }),
      });
    }

    if (!isPersonalSpace && space.state.get() === SpaceState.READY) {
      node.addAction(
        {
          id: 'rename-space',
          label: ['rename space label', { ns: SPACE_PLUGIN }],
          icon: (props) => <PencilSimpleLine {...props} />,
          keyBinding: 'shift+F6',
          invoke: () => dispatch({ plugin: SPACE_PLUGIN, action: SpaceAction.RENAME, data: { space } }),
        },
        {
          id: 'share-space',
          label: ['share space', { ns: SPACE_PLUGIN }],
          icon: (props) => <Users {...props} />,
          keyBinding: 'meta+.',
          invoke: () =>
            dispatch({ plugin: SPACE_PLUGIN, action: SpaceAction.SHARE, data: { spaceKey: space.key.toHex() } }),
        },
        {
          id: 'close-space',
          label: ['close space label', { ns: SPACE_PLUGIN }],
          icon: (props) => <X {...props} />,
          invoke: () => dispatch({ plugin: SPACE_PLUGIN, action: SpaceAction.CLOSE, data: { space } }),
        },
      );
    } else if (space.state.get() === SpaceState.INACTIVE) {
      node.addAction({
        id: 'open-space',
        label: ['open space label', { ns: SPACE_PLUGIN }],
        icon: (props) => <ClockCounterClockwise {...props} />,
        invoke: () => dispatch({ plugin: SPACE_PLUGIN, action: SpaceAction.OPEN, data: { space } }),
        properties: {
          disposition: 'toolbar',
        },
      });
    }

    node.addAction(
      {
        id: 'backup-space',
        label: ['export data label', { ns: SPACE_PLUGIN }],
        icon: (props) => <Download {...props} />,
        invoke: () => dispatch({ plugin: SPACE_PLUGIN, action: SpaceAction.EXPORT, data: { space } }),
      },
      {
        id: 'restore-space',
        label: ['import data label', { ns: SPACE_PLUGIN }],
        icon: (props) => <Upload {...props} />,
        invoke: () => dispatch({ plugin: SPACE_PLUGIN, action: SpaceAction.IMPORT, data: { space } }),
      },
    );

    if (!(folder instanceof Folder)) {
      return;
    }

    const childSubscriptions = new EventSubscriptions();
    const removedObjects = previousObjects.filter((object) => !folder.objects.includes(object));
    previousObjects = folder.objects;

    removedObjects.forEach((object) => parent.removeNode(object.id));
    folder.objects.forEach((object) => {
      if (!object) {
        return;
      }

      const unsubscribe = objectToGraphNode({ object, parent: node, dispatch, resolve });
      if (unsubscribe) {
        childSubscriptions.add(unsubscribe);
      }
    });

    return () => childSubscriptions.clear();
  });
};

export const objectToGraphNode = ({
  object,
  parent,
  dispatch,
  resolve,
}: {
  object: TypedObject;
  parent: Node;
  dispatch: DispatchIntent;
  resolve: MetadataResolver;
}): UnsubscribeCallback => {
  const space = getSpaceForObject(object);
  const metadata = object.__typename ? resolve(object.__typename) : object.type ? resolve(object.type) : {};
  const partials =
    space && object instanceof Folder ? getFolderGraphNodePartials({ folder: object, space, dispatch }) : {};

  let previousObjects: TypedObject[] = [];
  return effect(() => {
    const [node] = parent.addNode(SPACE_PLUGIN, {
      id: object.id,
      label: object.name || object.title || metadata.placeholder || ['unnamed object label', { ns: SPACE_PLUGIN }],
      description: object.description,
      icon: metadata.icon ?? ((props) => <Placeholder {...props} />),
      data: object,
      ...partials,
      properties: {
        ...partials.properties,
        testId: object instanceof Folder ? 'spacePlugin.folder' : 'spacePlugin.object',
        persistenceClass: 'folder',
      },
    });

    node.addAction(
      {
        id: 'rename',
        label: ['rename object label', { ns: SPACE_PLUGIN }],
        icon: (props) => <PencilSimpleLine {...props} />,
        keyBinding: 'shift+F6',
        invoke: () =>
          dispatch({
            action: SpaceAction.RENAME_OBJECT,
            data: { object },
          }),
      },
      {
        id: 'delete',
        label: ['delete object label', { ns: SPACE_PLUGIN }],
        icon: (props) => <Trash {...props} />,
        keyBinding: 'meta+Backspace',
        invoke: () =>
          dispatch([
            {
              action: SpaceAction.REMOVE_OBJECT,
              data: { object, folder: parent.data },
            },
          ]),
      },
    );

    if (!(object instanceof Folder)) {
      return;
    }

    const folder = object;
    const childSubscriptions = new EventSubscriptions();
    const removedObjects = previousObjects.filter((object) => !folder.objects.includes(object));
    previousObjects = folder.objects;

    removedObjects.forEach((object) => parent.removeNode(object.id));
    folder.objects.forEach((object) => {
      if (!object) {
        return;
      }

      const unsubscribe = objectToGraphNode({ object, parent: node, dispatch, resolve });
      if (unsubscribe) {
        childSubscriptions.add(unsubscribe);
      }
    });

    return () => childSubscriptions.clear();
  });
};

export const getActiveSpace = (graph: Graph, active?: string) => {
  if (!active) {
    return;
  }

  const node = graph.findNode(active);
  if (!node || !(node.data instanceof TypedObject)) {
    return;
  }

  return getSpaceForObject(node.data);
};

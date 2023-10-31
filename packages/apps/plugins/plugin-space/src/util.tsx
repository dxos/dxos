//
// Copyright 2023 DXOS.org
//

import {
  FolderPlus,
  PencilSimpleLine,
  Planet,
  Placeholder,
  Trash,
  Users,
  Intersect,
  Download,
  Upload,
  X,
  ClockCounterClockwise,
  Plus,
} from '@phosphor-icons/react';
import { effect } from '@preact/signals-react';
import React from 'react';

import type { Graph, Node } from '@braneframe/plugin-graph';
import { Folder } from '@braneframe/types';
import { LayoutAction, type DispatchIntent, type MetadataResolver } from '@dxos/app-framework';
import { EventSubscriptions, type UnsubscribeCallback } from '@dxos/async';
import { clone } from '@dxos/echo-schema';
import { PublicKey } from '@dxos/keys';
import { EchoDatabase, type Space, SpaceState, TypedObject, getSpaceForObject } from '@dxos/react-client/echo';

import { SPACE_PLUGIN, SpaceAction } from './types';

export const ROOT = 'root';
export const SHARED = 'shared-spaces';
export const HIDDEN = 'hidden-spaces';

export const isSpace = (data: unknown): data is Space =>
  data && typeof data === 'object'
    ? 'key' in data && data.key instanceof PublicKey && 'db' in data && data.db instanceof EchoDatabase
    : false;

export const getSpaceDisplayName = (space: Space): string | [string, { ns: string }] => {
  return (space.properties.name?.length ?? 0) > 0
    ? space.properties.name
    : space.state.get() === SpaceState.INITIALIZING
    ? ['loading space label', { ns: SPACE_PLUGIN }]
    : ['unnamed space label', { ns: SPACE_PLUGIN }];
};

// TODO(wittjosiah): Remove space folders from graph when closed.
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
  const isFolder = object instanceof Folder;
  const isSpaceFolder = isFolder && space && object.name === space.key.toHex();
  const isPersonalSpace = isSpaceFolder && parent.id === ROOT;
  const isSharedSpacesFolder = isFolder && object.name === SHARED && parent.id === ROOT;

  let previousObjects: TypedObject[] = [];
  return effect(() => {
    if (isSpaceFolder && space.state.get() === SpaceState.INACTIVE) {
      return;
    }

    const [node] = parent.addNode(SPACE_PLUGIN, {
      id: object.id,
      label: isPersonalSpace
        ? ['personal space label', { ns: SPACE_PLUGIN }]
        : isSharedSpacesFolder
        ? ['shared spaces label', { ns: SPACE_PLUGIN }]
        : isSpaceFolder
        ? getSpaceDisplayName(space)
        : object.name || object.title || metadata.fallbackName || ['unnamed object label', { ns: SPACE_PLUGIN }],
      description: isSpaceFolder ? space.properties.description : object.description,
      icon:
        isPersonalSpace || isSharedSpacesFolder
          ? undefined
          : isSpaceFolder
          ? (props) => <Planet {...props} />
          : metadata.icon ?? ((props) => <Placeholder {...props} />),
      data: isSharedSpacesFolder ? null : object,
      actions:
        isFolder && !isSharedSpacesFolder
          ? [
              {
                id: 'create-object-group',
                label: ['create object group label', { ns: SPACE_PLUGIN }],
                icon: (props) => <Plus {...props} />,
                invoke: () => {
                  // No-op.
                },
                properties: {
                  disposition: 'toolbar',
                  testId: 'spacePlugin.createObject',
                },
              },
            ]
          : [],
      properties: {
        // TODO(burdon): Factor out palette constants.
        palette: isPersonalSpace ? 'teal' : isSharedSpacesFolder ? 'pink' : undefined,
        'data-testid': isPersonalSpace
          ? 'spacePlugin.personalSpace'
          : isSharedSpacesFolder
          ? 'spacePlugin.sharedSpaces'
          : isSpaceFolder
          ? 'spacePlugin.space'
          : isFolder
          ? 'spacePlugin.folder'
          : undefined,
        persistenceClass: isSpaceFolder ? undefined : 'folder',
        ...(isFolder
          ? {
              acceptPersistenceClass: isSharedSpacesFolder ? undefined : new Set(['folder']),
              role: 'branch',
              onRearrangeChildren: (nextOrder: TypedObject[]) => {
                object.objects = nextOrder;
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
                  object.objects.push(newObject);
                } else {
                  // Add child to destination folder.
                  object.objects.push(child.data);
                }
              },
              onTransferEnd: (child: Node<TypedObject>, destination: Node) => {
                // Remove child from origin folder.
                const index = object.objects.indexOf(child.data);
                if (index > -1) {
                  object.objects.splice(index, 1);
                }

                const childSpace = getSpaceForObject(child.data);
                const destinationSpace = getSpaceForObject(destination.data);
                if (destinationSpace && childSpace && !childSpace.key.equals(destinationSpace.key)) {
                  // Mark child as deleted in origin space.
                  childSpace.db.remove(child.data);
                }
              },
            }
          : {}),
      },
    });

    if (isSharedSpacesFolder) {
      node.addAction(
        {
          id: 'create-space',
          label: ['create space label', { ns: 'os' }],
          icon: (props) => <Planet {...props} />,
          properties: {
            disposition: 'toolbar',
            testId: 'spacePlugin.createSpace',
          },
          invoke: () =>
            dispatch({
              plugin: SPACE_PLUGIN,
              action: SpaceAction.CREATE,
            }),
        },
        {
          id: 'join-space',
          label: ['join space label', { ns: 'os' }],
          icon: (props) => <Intersect {...props} />,
          properties: {
            testId: 'spacePlugin.joinSpace',
          },
          invoke: () =>
            dispatch([
              {
                plugin: SPACE_PLUGIN,
                action: SpaceAction.JOIN,
              },
              {
                action: LayoutAction.ACTIVATE,
              },
            ]),
        },
      );
    }

    if (isSpaceFolder && !isPersonalSpace) {
      node.addAction(
        {
          id: 'rename-space',
          label: ['rename space label', { ns: SPACE_PLUGIN }],
          icon: (props) => <PencilSimpleLine {...props} />,
          invoke: () => dispatch({ plugin: SPACE_PLUGIN, action: SpaceAction.RENAME, data: { space, id: object.id } }),
        },
        {
          id: 'share-space',
          label: ['share space', { ns: SPACE_PLUGIN }],
          icon: (props) => <Users {...props} />,
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
    }

    if (isSpaceFolder) {
      node.actionsMap['create-object-group'].addAction({
        id: 'folder/create',
        label: ['add folder label', { ns: SPACE_PLUGIN }],
        icon: (props) => <FolderPlus {...props} />,
        invoke: () =>
          dispatch({
            plugin: SPACE_PLUGIN,
            action: SpaceAction.ADD_TO_FOLDER,
            data: { folder: object, object: new Folder() },
          }),
      });

      node.addAction(
        {
          id: 'backup-space',
          label: ['download all docs in space label', { ns: SPACE_PLUGIN }],
          icon: (props) => <Download {...props} />,
          invoke: () => dispatch({ plugin: SPACE_PLUGIN, action: SpaceAction.BACKUP, data: { space } }),
        },
        {
          id: 'restore-space',
          label: ['upload all docs in space label', { ns: SPACE_PLUGIN }],
          icon: (props) => <Upload {...props} />,
          invoke: () => dispatch({ plugin: SPACE_PLUGIN, action: SpaceAction.RESTORE, data: { space } }),
        },
      );
    }

    if (!isSpaceFolder && !isSharedSpacesFolder) {
      node.addAction(
        {
          id: 'rename',
          label: ['rename object label', { ns: SPACE_PLUGIN }],
          icon: (props) => <PencilSimpleLine {...props} />,
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
          invoke: () =>
            dispatch([
              {
                action: SpaceAction.REMOVE_FROM_FOLDER,
                data: { folder: parent.data, object },
              },
              {
                action: SpaceAction.REMOVE_OBJECT,
                data: { object },
              },
            ]),
        },
      );
    }

    if (!isFolder) {
      return;
    }

    const folder = object as Folder;
    const childSubscriptions = new EventSubscriptions();
    const removedObjects = previousObjects.filter((object) => !folder.objects.includes(object));
    previousObjects = folder.objects;

    removedObjects.forEach((object) => parent.removeNode(object.id));
    folder.objects.forEach((object) => {
      const unsubscribe = objectToGraphNode({ object, parent: node, dispatch, resolve });
      if (unsubscribe) {
        childSubscriptions.add(unsubscribe);
      }
    });

    return () => childSubscriptions.clear();
  });
};

export const hiddenSpacesToGraphNodes = ({
  parent,
  hidden,
  spaces,
  dispatch,
}: {
  parent: Node;
  hidden?: boolean;
  spaces: Space[];
  dispatch: DispatchIntent;
}) => {
  if (!hidden) {
    parent.removeNode(HIDDEN);
    return;
  }

  const [hiddenSpacesNode] = parent.addNode(SPACE_PLUGIN, {
    id: HIDDEN,
    label: ['hidden spaces label', { ns: SPACE_PLUGIN }],
    properties: {
      palette: 'orange',
    },
  });

  spaces
    .filter((space) => space.state.get() === SpaceState.INACTIVE)
    .forEach((space) => {
      const [node] = hiddenSpacesNode.addNode(SPACE_PLUGIN, {
        id: space.key.toHex(),
        label: getSpaceDisplayName(space),
        icon: (props) => <Planet {...props} />,
        properties: {
          disabled: true,
        },
      });

      node.addAction({
        id: 'open-space',
        label: ['open space label', { ns: SPACE_PLUGIN }],
        icon: (props) => <ClockCounterClockwise {...props} />,
        invoke: () => dispatch({ plugin: SPACE_PLUGIN, action: SpaceAction.OPEN, data: { space } }),
        properties: {
          disposition: 'toolbar',
        },
      });
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

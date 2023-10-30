//
// Copyright 2023 DXOS.org
//

import {
  Folder as FolderIcon,
  FolderPlus,
  PencilSimpleLine,
  Planet,
  Placeholder,
  Trash,
  Users,
  type IconProps,
  Intersect,
  Download,
  Upload,
  ClockCounterClockwise,
  X,
} from '@phosphor-icons/react';
import { effect } from '@preact/signals-react';
import React, { type FC } from 'react';

import { type Node } from '@braneframe/plugin-graph';
import { Folder } from '@braneframe/types';
import { LayoutAction, type DispatchIntent } from '@dxos/app-framework';
import { EventSubscriptions, type UnsubscribeCallback } from '@dxos/async';
import { clone } from '@dxos/echo-schema';
import { PublicKey } from '@dxos/keys';
import { EchoDatabase, type Space, SpaceState, type TypedObject, getSpaceForObject } from '@dxos/react-client/echo';

import { SPACE_PLUGIN, SpaceAction } from './types';

export const ROOT = 'root';
export const SHARED = 'shared-spaces';

export const isSpace = (data: unknown): data is Space =>
  data && typeof data === 'object'
    ? 'key' in data && data.key instanceof PublicKey && 'db' in data && data.db instanceof EchoDatabase
    : false;

export const getSpaceDisplayName = (space: Space): string | [string, { ns: string }] => {
  // TODO(wittjosiah): Diff between loading and closed.
  const disabled = space.state.get() !== SpaceState.READY;
  return (space.properties.name?.length ?? 0) > 0
    ? space.properties.name
    : disabled
    ? ['loading space title', { ns: SPACE_PLUGIN }]
    : ['untitled space title', { ns: SPACE_PLUGIN }];
};

export const getObjectDisplayName = (object: TypedObject): string | [string, { ns: string }] => {
  return object.name || object.title || 'todo';
};

export const getObjectIcon = (object: TypedObject): FC<IconProps> => {
  return object instanceof Folder ? (props) => <FolderIcon {...props} /> : (props) => <Placeholder {...props} />;
};

// TODO(wittjosiah): Remove space folders from graph when closed.
export const objectToGraphNode = ({
  object,
  parent,
  dispatch,
}: {
  object: TypedObject;
  parent: Node;
  dispatch: DispatchIntent;
}): UnsubscribeCallback => {
  const space = getSpaceForObject(object);
  const disabled = space?.state.get() !== SpaceState.READY;
  const isFolder = object instanceof Folder;
  const isSpaceFolder = isFolder && space && object.name === space.key.toHex();
  const isPersonalSpace = isSpaceFolder && parent.id === ROOT;
  const isSharedSpacesFolder = isFolder && object.name === SHARED && parent.id === ROOT;

  let previousObjects: TypedObject[] = [];
  return effect(() => {
    const [node] = parent.addNode(SPACE_PLUGIN, {
      id: object.id,
      label: isPersonalSpace
        ? ['personal space label', { ns: SPACE_PLUGIN }]
        : isSharedSpacesFolder
        ? ['shared spaces label', { ns: SPACE_PLUGIN }]
        : isSpaceFolder
        ? getSpaceDisplayName(space)
        : getObjectDisplayName(object),
      description: isSpaceFolder ? space.properties.description : object.description,
      icon:
        isPersonalSpace || isSharedSpacesFolder
          ? undefined
          : isSpaceFolder
          ? (props) => <Planet {...props} />
          : isFolder
          ? (props) => <FolderIcon {...props} />
          : getObjectIcon(object),
      data: isSharedSpacesFolder ? null : object,
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
        persistenceClass: 'folder',
        ...(isFolder
          ? {
              acceptPersistenceClass: new Set(['folder']),
              role: 'branch',
              onRearrangeChildren: (nextOrder: TypedObject[]) => {
                object.objects = nextOrder;
              },
              onTransferStartChild: (child: Node<TypedObject>, nextIndex: string) => {
                const childSpace = getSpaceForObject(child.data);
                if (space && childSpace && !childSpace.key.equals(space.key)) {
                  // Create clone of child and add to destination space.
                  const newObject = clone(child.data, {
                    retainId: true,
                    // TODO(wittjosiah): This needs to be generalized and not hardcoded here.
                    additional: [child.data.content, ...child.data.objects],
                  });
                  space.db.add(newObject);
                  object.objects.push(newObject);
                } else {
                  // Add child to destination folder.
                  object.objects.push(child.data);
                }
              },
              onTransferEndChild: (child: Node<TypedObject>) => {
                // Remove child from origin folder.
                const index = object.objects.indexOf(child.data);
                if (index > -1) {
                  object.objects.splice(index, 1);
                }

                const childSpace = getSpaceForObject(child.data);
                if (space && childSpace && childSpace.key.equals(space.key)) {
                  // Mark child as deleted in origin space.
                  space.db.remove(child.data);
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
          properties: {
            disabled,
          },
        },
        {
          id: 'share-space',
          label: ['share space', { ns: SPACE_PLUGIN }],
          icon: (props) => <Users {...props} />,
          invoke: () =>
            dispatch({ plugin: SPACE_PLUGIN, action: SpaceAction.SHARE, data: { spaceKey: space.key.toHex() } }),
          properties: {
            disabled,
          },
        },
        space.state.get() === SpaceState.READY
          ? {
              id: 'close-space',
              label: ['close space label', { ns: SPACE_PLUGIN }],
              icon: (props) => <X {...props} />,
              invoke: () => dispatch({ plugin: SPACE_PLUGIN, action: SpaceAction.CLOSE, data: { space } }),
            }
          : {
              id: 'open-space',
              label: ['open space label', { ns: SPACE_PLUGIN }],
              icon: (props) => <ClockCounterClockwise {...props} />,
              invoke: () => dispatch({ plugin: SPACE_PLUGIN, action: SpaceAction.OPEN, data: { space } }),
            },
      );
    }

    if (isSpaceFolder) {
      node.addAction(
        {
          id: 'folder/create',
          label: ['add folder label', { ns: SPACE_PLUGIN }],
          icon: (props) => <FolderPlus {...props} />,
          invoke: () =>
            dispatch({
              plugin: SPACE_PLUGIN,
              action: SpaceAction.ADD_TO_FOLDER,
              data: { folder: object, object: new Folder() },
            }),
          properties: {
            disabled,
          },
        },
        {
          id: 'backup-space',
          label: ['download all docs in space label', { ns: SPACE_PLUGIN }],
          icon: (props) => <Download {...props} />,
          invoke: () => dispatch({ plugin: SPACE_PLUGIN, action: SpaceAction.BACKUP, data: { space } }),
          properties: {
            disabled,
          },
        },
        {
          id: 'restore-space',
          label: ['upload all docs in space label', { ns: SPACE_PLUGIN }],
          icon: (props) => <Upload {...props} />,
          invoke: () => dispatch({ plugin: SPACE_PLUGIN, action: SpaceAction.RESTORE, data: { space } }),
          properties: {
            disabled,
          },
        },
      );
    }

    if (!isFolder) {
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
      return;
    }

    const folder = object as Folder;
    const childSubscriptions = new EventSubscriptions();
    const removedObjects = previousObjects.filter((object) => !folder.objects.includes(object));
    previousObjects = folder.objects;

    removedObjects.forEach((object) => parent.removeNode(object.id));
    folder.objects.forEach((object) => {
      const unsubscribe = objectToGraphNode({ object, parent: node, dispatch });
      if (unsubscribe) {
        childSubscriptions.add(unsubscribe);
      }
    });

    return () => childSubscriptions.clear();
  });
};

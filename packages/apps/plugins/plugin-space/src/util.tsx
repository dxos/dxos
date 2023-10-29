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
} from '@phosphor-icons/react';
import { effect } from '@preact/signals-react';
import React, { type FC } from 'react';

import { type Node } from '@braneframe/plugin-graph';
import { Folder } from '@braneframe/types';
import type { DispatchIntent } from '@dxos/app-framework';
import { EventSubscriptions, type UnsubscribeCallback } from '@dxos/async';
import { clone } from '@dxos/echo-schema';
import { PublicKey } from '@dxos/keys';
import { EchoDatabase, type Space, SpaceState, type TypedObject, getSpaceForObject } from '@dxos/react-client/echo';

import { SPACE_PLUGIN, SpaceAction } from './types';

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
export const folderToGraphNodes = ({
  parent,
  representsSpace,
  dispatch,
}: {
  parent: Node<Folder>;
  representsSpace?: boolean;
  dispatch: DispatchIntent;
}): UnsubscribeCallback => {
  const folder = parent.data;

  let previousObjects: TypedObject[] = [];
  return effect(() => {
    const childSubscriptions = new EventSubscriptions();
    const removedObjects = previousObjects.filter((object) => !folder.objects.includes(object));
    previousObjects = folder.objects;

    removedObjects.forEach((object) => parent.removeNode(object.id));
    folder.objects.forEach((object) => {
      const space = getSpaceForObject(object);
      const disabled = space?.state.get() !== SpaceState.READY;
      const isFolder = object instanceof Folder;

      const [node] = parent.addNode(SPACE_PLUGIN, {
        id: object.id,
        label: representsSpace && space ? getSpaceDisplayName(space) : getObjectDisplayName(object),
        description: object.description,
        icon: representsSpace ? (props) => <Planet {...props} /> : getObjectIcon(object),
        data: isFolder ? (object as Folder) : object,
        properties: {
          'data-testid': space && 'spacePlugin.space',
          persistenceClass: 'folder',
          ...(isFolder
            ? {
                role: 'branch',
                onRearrangeChildren: (nextOrder: TypedObject[]) => {
                  object.objects = nextOrder;
                },
                acceptPersistenceClass: new Set(['folder']),
                onTransferStartChild: (child: Node<TypedObject>, nextIndex: string) => {
                  const childSpace = getSpaceForObject(child.data);
                  if (representsSpace && space && childSpace && !childSpace.key.equals(space.key)) {
                    // Create clone of child and add to destination space.
                    const newObject = clone(child.data, {
                      retainId: true,
                      // TODO(wittjosiah): This needs to be generalized and not hardcoded here.
                      additional: [child.data.content, child.data.objects],
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
                  if (representsSpace && space && childSpace && childSpace.key.equals(space.key)) {
                    // Mark child as deleted in origin space.
                    space.db.remove(child.data);
                  }
                },
              }
            : {}),
        },
      });

      if (representsSpace && space) {
        const baseIntent = { plugin: SPACE_PLUGIN, data: { spaceKey: space.key.toHex() } };
        node.addAction(
          {
            id: 'rename-space',
            label: ['rename space label', { ns: SPACE_PLUGIN }],
            icon: (props) => <PencilSimpleLine {...props} />,
            invoke: () => dispatch({ ...baseIntent, action: SpaceAction.RENAME }),
            properties: {
              disabled,
            },
          },
          {
            id: 'share-space',
            label: ['share space', { ns: SPACE_PLUGIN }],
            icon: (props) => <Users {...props} />,
            invoke: () => dispatch({ ...baseIntent, action: SpaceAction.SHARE }),
            properties: {
              disabled,
            },
          },
          {
            id: 'folder/create',
            label: ['add folder label', { ns: SPACE_PLUGIN }],
            icon: (props) => <FolderPlus {...props} />,
            invoke: () =>
              dispatch({
                ...baseIntent,
                action: SpaceAction.ADD_TO_FOLDER,
                data: { folder: object, object: new Folder() },
              }),
            properties: {
              disabled,
            },
          },
        );
      } else {
        node.addAction(
          {
            id: 'rename',
            label: ['rename object label', { ns: SPACE_PLUGIN }],
            icon: (props) => <PencilSimpleLine {...props} />,
            invoke: () =>
              dispatch({
                action: SpaceAction.RENAME_OBJECT,
                data: { spaceKey: space?.key.toHex(), objectId: object.id },
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
                  data: { spaceKey: space?.key.toHex(), objectId: object.id },
                },
              ]),
          },
        );
      }

      if (isFolder) {
        // TODO(wittjosiah): Any.
        childSubscriptions.add(folderToGraphNodes({ parent: node as any, dispatch }));
      }
    });

    return () => childSubscriptions.clear();
  });
};

// export const spaceToGraphNode = ({
//   space,
//   parent,
//   dispatch,
//   settings,
// }: {
//   space: Space;
//   parent: Node;
//   dispatch: DispatchIntent;
//   settings: SpaceSettingsProps;
// }): { node: Node<Space>; subscription: UnsubscribeCallback } => {
//   const id = createNodeId(space.key);
//   const state = space.state.get();
//   // TODO(burdon): Add disabled state to node (e.g., prevent showing "add document" action if disabled).
//   const disabled = state !== SpaceState.READY;
//   const error = state === SpaceState.ERROR;
//   const inactive = state === SpaceState.INACTIVE;
//   const baseIntent = { plugin: SPACE_PLUGIN, data: { spaceKey: space.key.toHex() } };

//   const spaceOrderQuery = space.db.query(Folder.filter({ scope: id }));

//   let spaceOrder: ObjectOrder | undefined;

//   let node!: Node;
//   // TODO(wittjosiah): Why is this batch needed?
//   batch(() => {
//     [node] = parent.addNode(SPACE_PLUGIN, {
//       id,
//       label: parent.id === 'root' ? ['personal space label', { ns: SPACE_PLUGIN }] : getSpaceDisplayName(space),
//       description: space.properties.description,
//       ...(parent.id !== 'root' && { icon: (props) => <Planet {...props} /> }),
//       data: space,
//       properties: {
//         // TODO(burdon): Factor out palette constants.
//         palette: parent.id === 'root' ? 'teal' : undefined,
//         'data-testid': parent.id === 'root' ? 'spacePlugin.personalSpace' : 'spacePlugin.space',
//         role: 'branch',
//         hidden: settings.showHidden ? false : inactive,
//         disabled,
//         error,
//         onRearrangeChildren: (nextOrder: string[]) => {
//           if (!spaceOrder) {
//             const nextObjectOrder = new ObjectOrder({
//               scope: id,
//               order: nextOrder,
//             });
//             space.db.add(nextObjectOrder);
//           } else {
//             spaceOrder.order = nextOrder;
//           }
//         },
//         persistenceClass: 'appState',
//         acceptPersistenceClass: new Set(['spaceObject']),
//         // TODO(wittjosiah): Rename migrate to transfer.
//         onMigrateStartChild: (child: Node<TypedObject>, nextIndex: string) => {
//           // Create clone of child and add to migration destination.
//           const object = clone(child.data, {
//             retainId: true,
//             additional: [child.data.content],
//           });
//           space.db.add(object);
//         },
//         onMigrateEndChild: (child: Node<TypedObject>) => {
//           // Remove child being replicated from migration origin.
//           space.db.remove(child.data);
//         },
//       },
//     });
//   });

//   const updateSpaceOrder = ({ objects: spacesOrders }: Query<ObjectOrder>) => {
//     spaceOrder = spacesOrders[0];
//     node.childrenMap = inferRecordOrder(node.childrenMap, spaceOrder?.order);
//   };

//   updateSpaceOrder(spaceOrderQuery);

//   const subscription = spaceOrderQuery.subscribe(updateSpaceOrder);

//   if (parent.id !== 'root') {
//     node.addAction(
//       {
//         id: 'rename-space',
//         label: ['rename space label', { ns: SPACE_PLUGIN }],
//         icon: (props) => <PencilSimpleLine {...props} />,
//         invoke: () => dispatch({ ...baseIntent, action: SpaceAction.RENAME }),
//         properties: {
//           disabled: disabled || error,
//         },
//       },
//       {
//         id: 'share-space',
//         label: ['share space', { ns: SPACE_PLUGIN }],
//         icon: (props) => <Users {...props} />,
//         invoke: () => dispatch({ ...baseIntent, action: SpaceAction.SHARE }),
//         properties: {
//           disabled: disabled || error,
//         },
//       },
//     );
//   }

//   node.addAction(
//     {
//       id: 'backup-space',
//       label: ['download all docs in space label', { ns: SPACE_PLUGIN }],
//       icon: (props) => <Download {...props} />,
//       invoke: () => dispatch({ ...baseIntent, action: SpaceAction.BACKUP }),
//       properties: {
//         disabled: disabled || error,
//       },
//     },
//     {
//       id: 'restore-space',
//       label: ['upload all docs in space label', { ns: SPACE_PLUGIN }],
//       icon: (props) => <Upload {...props} />,
//       invoke: () => dispatch({ ...baseIntent, action: SpaceAction.RESTORE }),
//       properties: {
//         disabled: disabled || error,
//       },
//     },
//   );

//   if (parent.id !== 'root') {
//     if (space.state.get() === SpaceState.READY) {
//       node.addAction({
//         id: 'close-space',
//         label: ['close space label', { ns: SPACE_PLUGIN }],
//         icon: (props) => <X {...props} />,
//         invoke: () => dispatch({ ...baseIntent, action: SpaceAction.CLOSE }),
//       });
//     } else {
//       node.addAction({
//         id: 'open-space',
//         label: ['open space label', { ns: SPACE_PLUGIN }],
//         icon: (props) => <ClockCounterClockwise {...props} />,
//         invoke: () => dispatch({ ...baseIntent, action: SpaceAction.OPEN }),
//       });
//     }
//   }

//   return { node, subscription };
// };

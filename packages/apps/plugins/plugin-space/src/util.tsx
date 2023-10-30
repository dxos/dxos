//
// Copyright 2023 DXOS.org
//

import { ClockCounterClockwise, Download, Users, PencilSimpleLine, Planet, Upload, X } from '@phosphor-icons/react';
import { batch } from '@preact/signals-react';
import React from 'react';

import { type Node } from '@braneframe/plugin-graph';
import { ObjectOrder } from '@braneframe/types';
import { type DispatchIntent } from '@dxos/app-framework';
import { type UnsubscribeCallback } from '@dxos/async';
import { clone } from '@dxos/echo-schema';
import { PublicKey, type PublicKeyLike } from '@dxos/keys';
import { EchoDatabase, type Space, SpaceState, type TypedObject } from '@dxos/react-client/echo';
import { inferRecordOrder } from '@dxos/util';

import { SPACE_PLUGIN, SPACE_PLUGIN_SHORT_ID, SpaceAction, type SpaceSettingsProps } from './types';

export const isSpace = (data: unknown): data is Space =>
  data && typeof data === 'object'
    ? 'key' in data && data.key instanceof PublicKey && 'db' in data && data.db instanceof EchoDatabase
    : false;

// TODO(burdon): Factor out.
export const createNodeId = (spaceKey: PublicKeyLike) => {
  if (spaceKey instanceof PublicKey) {
    spaceKey = spaceKey.toHex();
  }

  return `${SPACE_PLUGIN_SHORT_ID}-${spaceKey}`;
};

export const getSpaceDisplayName = (space: Space): string | [string, { ns: string }] => {
  const disabled = space.state.get() !== SpaceState.READY;
  return (space.properties.name?.length ?? 0) > 0
    ? space.properties.name
    : disabled
    ? ['loading space title', { ns: SPACE_PLUGIN }]
    : ['untitled space title', { ns: SPACE_PLUGIN }];
};

export const spaceToGraphNode = ({
  space,
  parent,
  dispatch,
  settings,
}: {
  space: Space;
  parent: Node;
  dispatch: DispatchIntent;
  settings: SpaceSettingsProps;
}): { node: Node<Space>; subscription: UnsubscribeCallback } => {
  const id = createNodeId(space.key);
  const state = space.state.get();
  // TODO(burdon): Add disabled state to node (e.g., prevent showing "add document" action if disabled).
  const disabled = state !== SpaceState.READY;
  const error = state === SpaceState.ERROR;
  const inactive = state === SpaceState.INACTIVE;
  const baseIntent = { plugin: SPACE_PLUGIN, data: { spaceKey: space.key.toHex() } };

  const spaceOrderQuery = space.db.query(ObjectOrder.filter({ scope: id }));

  let spaceOrder: ObjectOrder | undefined;

  let node!: Node;
  // TODO(wittjosiah): Why is this batch needed?
  batch(() => {
    [node] = parent.addNode(SPACE_PLUGIN, {
      id,
      label: parent.id === 'root' ? ['personal space label', { ns: SPACE_PLUGIN }] : getSpaceDisplayName(space),
      description: space.properties.description,
      ...(parent.id !== 'root' && { icon: (props) => <Planet {...props} /> }),
      data: space,
      properties: {
        // TODO(burdon): Factor out palette constants.
        palette: parent.id === 'root' ? 'teal' : undefined,
        'data-testid': parent.id === 'root' ? 'spacePlugin.personalSpace' : 'spacePlugin.space',
        role: 'branch',
        hidden: settings.showHidden ? false : inactive,
        disabled,
        error,
        onRearrangeChildren: (nextOrder: string[]) => {
          if (!spaceOrder) {
            const nextObjectOrder = new ObjectOrder({
              scope: id,
              order: nextOrder,
            });
            space.db.add(nextObjectOrder);
            spaceOrder = nextObjectOrder;
          } else {
            spaceOrder.order = nextOrder;
          }
          updateSpaceOrder({ objects: [spaceOrder] });
        },
        persistenceClass: 'appState',
        acceptPersistenceClass: new Set(['spaceObject']),
        // TODO(wittjosiah): Rename migrate to transfer.
        onMigrateStartChild: (child: Node<TypedObject>, nextIndex: string) => {
          // Create clone of child and add to migration destination.
          const object = clone(child.data, {
            retainId: true,
            additional: [child.data.content],
          });
          space.db.add(object);
        },
        onMigrateEndChild: (child: Node<TypedObject>) => {
          // Remove child being replicated from migration origin.
          space.db.remove(child.data);
        },
      },
    });
  });

  const updateSpaceOrder = ({ objects: spacesOrders }: { objects: ObjectOrder[] }) => {
    spaceOrder = spacesOrders[0];
    node.childrenMap = inferRecordOrder(node.childrenMap, spaceOrder?.order);
  };

  updateSpaceOrder(spaceOrderQuery);

  const subscription = spaceOrderQuery.subscribe(updateSpaceOrder);

  if (parent.id !== 'root') {
    node.addAction(
      {
        id: 'rename-space',
        label: ['rename space label', { ns: SPACE_PLUGIN }],
        icon: (props) => <PencilSimpleLine {...props} />,
        invoke: () => dispatch({ ...baseIntent, action: SpaceAction.RENAME }),
        properties: {
          disabled: disabled || error,
        },
      },
      {
        id: 'share-space',
        label: ['share space', { ns: SPACE_PLUGIN }],
        icon: (props) => <Users {...props} />,
        invoke: () => dispatch({ ...baseIntent, action: SpaceAction.SHARE }),
        properties: {
          disabled: disabled || error,
        },
      },
    );
  }

  node.addAction(
    {
      id: 'backup-space',
      label: ['download all docs in space label', { ns: SPACE_PLUGIN }],
      icon: (props) => <Download {...props} />,
      invoke: () => dispatch({ ...baseIntent, action: SpaceAction.BACKUP }),
      properties: {
        disabled: disabled || error,
      },
    },
    {
      id: 'restore-space',
      label: ['upload all docs in space label', { ns: SPACE_PLUGIN }],
      icon: (props) => <Upload {...props} />,
      invoke: () => dispatch({ ...baseIntent, action: SpaceAction.RESTORE }),
      properties: {
        disabled: disabled || error,
      },
    },
  );

  if (parent.id !== 'root') {
    if (space.state.get() === SpaceState.READY) {
      node.addAction({
        id: 'close-space',
        label: ['close space label', { ns: SPACE_PLUGIN }],
        icon: (props) => <X {...props} />,
        invoke: () => dispatch({ ...baseIntent, action: SpaceAction.CLOSE }),
      });
    } else {
      node.addAction({
        id: 'open-space',
        label: ['open space label', { ns: SPACE_PLUGIN }],
        icon: (props) => <ClockCounterClockwise {...props} />,
        invoke: () => dispatch({ ...baseIntent, action: SpaceAction.OPEN }),
      });
    }
  }

  return { node, subscription };
};

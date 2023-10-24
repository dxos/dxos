//
// Copyright 2023 DXOS.org
//

import { ClockCounterClockwise, Download, Users, PencilSimpleLine, Planet, Upload, X } from '@phosphor-icons/react';
import { batch } from '@preact/signals-react';
import { type getIndices } from '@tldraw/indices';
import React from 'react';

import { type Node } from '@braneframe/plugin-graph';
import { type AppState } from '@braneframe/types';
import { type DispatchIntent } from '@dxos/app-framework';
import { clone } from '@dxos/echo-schema';
import { PublicKey, type PublicKeyLike } from '@dxos/keys';
import { EchoDatabase, type Space, SpaceState, type TypedObject } from '@dxos/react-client/echo';

import { getAppStateIndex, setAppStateIndex } from './helpers';
import { SPACE_PLUGIN, SPACE_PLUGIN_SHORT_ID, SpaceAction, type SpaceSettingsProps } from './types';

type Index = ReturnType<typeof getIndices>[number];

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
  appState,
  defaultIndex,
}: {
  space: Space;
  parent: Node;
  dispatch: DispatchIntent;
  settings: SpaceSettingsProps;
  appState?: AppState;
  defaultIndex?: string;
}): Node<Space> => {
  const id = createNodeId(space.key);
  const state = space.state.get();
  // TODO(burdon): Add disabled state to node (e.g., prevent showing "add document" action if disabled).
  const disabled = state !== SpaceState.READY;
  const error = state === SpaceState.ERROR;
  const inactive = state === SpaceState.INACTIVE;
  const baseIntent = { plugin: SPACE_PLUGIN, data: { spaceKey: space.key.toHex() } };

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
        index: getAppStateIndex(id, appState) ?? setAppStateIndex(id, defaultIndex ?? 'a0', appState),
        onRearrangeChild: (child: Node<TypedObject>, nextIndex: Index) => {
          // TODO(thure): Reconcile with `TypedObject`’s `meta` record.
          child.properties.index = nextIndex;
          if (child.data.meta) {
            child.data.meta.index = nextIndex;
          }
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
          // TODO(wittjosiah): Use separate object to store graph/tree order.
          // object.meta.index = nextIndex;
          space.db.add(object);
        },
        onMigrateEndChild: (child: Node<TypedObject>) => {
          // Remove child being replicated from migration origin.
          space.db.remove(child.data);
        },
      },
    });
  });

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

  return node;
};

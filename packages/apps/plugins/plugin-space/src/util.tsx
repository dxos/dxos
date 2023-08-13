//
// Copyright 2023 DXOS.org
//

import { Download, PaperPlane, PencilSimpleLine, Planet, Upload, X } from '@phosphor-icons/react';
import { getIndices } from '@tldraw/indices';
import React from 'react';

import { ClientPluginProvides } from '@braneframe/plugin-client';
import { GraphNode } from '@braneframe/plugin-graph';
import { PublicKey, PublicKeyLike } from '@dxos/keys';
import { log } from '@dxos/log';
import { EchoDatabase, Space, SpaceState, TypedObject } from '@dxos/react-client/echo';
import { Plugin, findPlugin } from '@dxos/react-surface';

import { SPACE_PLUGIN, SPACE_PLUGIN_SHORT_ID, SpaceAction } from './types';

export const isSpace = (data: unknown): data is Space =>
  data && typeof data === 'object'
    ? 'key' in data && data.key instanceof PublicKey && 'db' in data && data.db instanceof EchoDatabase
    : false;

export const getSpaceId = (spaceKey: PublicKeyLike) => {
  if (spaceKey instanceof PublicKey) {
    spaceKey = spaceKey.toHex();
  }

  return `${SPACE_PLUGIN_SHORT_ID}/${spaceKey}`;
};

export const getSpaceDisplayName = (space: Space): string | [string, { ns: string }] => {
  const disabled = space.state.get() !== SpaceState.READY;
  return (space.properties.name?.length ?? 0) > 0
    ? space.properties.name
    : disabled
    ? ['loading space title', { ns: SPACE_PLUGIN }]
    : ['untitled space title', { ns: SPACE_PLUGIN }];
};

export const spaceToGraphNode = (space: Space, plugins: Plugin[], index: string): GraphNode<Space> => {
  const clientPlugin = findPlugin<ClientPluginProvides>(plugins, 'dxos.org/plugin/client');
  if (!clientPlugin) {
    throw new Error('Client plugin not found');
  }

  const id = getSpaceId(space.key);
  const actionIndices = getIndices(5);
  const state = space.state.get();
  const disabled = state !== SpaceState.READY;
  const error = state === SpaceState.ERROR;
  const inactive = state === SpaceState.INACTIVE;
  const baseIntent = { plugin: SPACE_PLUGIN, data: { spaceKey: space.key.toHex() } };
  const node: GraphNode = {
    id,
    index,
    label: getSpaceDisplayName(space),
    description: space.properties.description,
    icon: (props) => <Planet {...props} />,
    data: space,
    // TODO(burdon): Rename onChildMove and/or merge with onMoveNode?
    onChildrenRearrange: (child: GraphNode<TypedObject>, nextIndex) => {
      log.info('onChildrenRearrange', { child: JSON.stringify(child.data?.meta), nextIndex }); // TODO(burdon): Remove.
      if (child.data) {
        // TODO(burdon): Decouple from object's data structure.
        child.data.meta = {
          ...child.data?.meta,
          index: nextIndex,
        };
      }
    },
    onMoveNode: (
      source: GraphNode<TypedObject>,
      target: GraphNode<TypedObject>,
      child: GraphNode<TypedObject>,
      nextIndex,
    ) => {
      log.info('onParentMove', { source: source.id, target: target.id, child: child.id, nextIndex });
    },
    attributes: {
      role: 'branch',
      hidden: inactive,
      disabled,
      error,
    },
    pluginActions: {
      [SPACE_PLUGIN]: [
        {
          id: 'rename-space',
          index: actionIndices[0],
          label: ['rename space label', { ns: SPACE_PLUGIN }],
          icon: (props) => <PencilSimpleLine {...props} />,
          intent: { ...baseIntent, action: SpaceAction.RENAME },
          disabled: disabled || error,
        },
        {
          id: 'share-space',
          index: actionIndices[1],
          label: ['share space', { ns: SPACE_PLUGIN }],
          icon: (props) => <PaperPlane {...props} />,
          intent: { ...baseIntent, action: SpaceAction.SHARE },
          disabled: disabled || error,
        },
        {
          id: 'backup-space',
          index: actionIndices[3],
          label: ['download all docs in space label', { ns: SPACE_PLUGIN }],
          icon: (props) => <Download {...props} />,
          intent: { ...baseIntent, action: SpaceAction.BACKUP },
          disabled: disabled || error,
        },
        {
          id: 'restore-space',
          index: actionIndices[4],
          label: ['upload all docs in space label', { ns: SPACE_PLUGIN }],
          icon: (props) => <Upload {...props} />,
          intent: { ...baseIntent, action: SpaceAction.RESTORE },
          disabled: disabled || error,
        },
        {
          id: 'close-space',
          index: actionIndices[2],
          label: ['close space label', { ns: SPACE_PLUGIN }],
          icon: (props) => <X {...props} />,
          intent: { ...baseIntent, action: SpaceAction.CLOSE },
        },
      ],
    },
  };

  return node;
};

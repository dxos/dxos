//
// Copyright 2023 DXOS.org
//

import { Download, PaperPlane, PencilSimpleLine, Planet, Upload, X } from '@phosphor-icons/react';
import { getIndices } from '@tldraw/indices';
import React from 'react';

import { Graph } from '@braneframe/plugin-graph';
import { PublicKey, PublicKeyLike } from '@dxos/keys';
import { log } from '@dxos/log';
import { EchoDatabase, Space, SpaceState, TypedObject } from '@dxos/react-client/echo';

import { SPACE_PLUGIN, SPACE_PLUGIN_SHORT_ID, SpaceAction } from './types';

type Index = ReturnType<typeof getIndices>[number];

export const isSpace = (data: unknown): data is Space =>
  data && typeof data === 'object'
    ? 'key' in data && data.key instanceof PublicKey && 'db' in data && data.db instanceof EchoDatabase
    : false;

export const getSpaceId = (spaceKey: PublicKeyLike) => {
  if (spaceKey instanceof PublicKey) {
    spaceKey = spaceKey.toHex();
  }

  return `${SPACE_PLUGIN_SHORT_ID}:${spaceKey}`;
};

export const getSpaceDisplayName = (space: Space): string | [string, { ns: string }] => {
  const disabled = space.state.get() !== SpaceState.READY;
  return (space.properties.name?.length ?? 0) > 0
    ? space.properties.name
    : disabled
    ? ['loading space title', { ns: SPACE_PLUGIN }]
    : ['untitled space title', { ns: SPACE_PLUGIN }];
};

export const spaceToGraphNode = (space: Space, parent: Graph.Node, index: string): Graph.Node<Space> => {
  const id = getSpaceId(space.key);
  const state = space.state.get();
  const disabled = state !== SpaceState.READY;
  const error = state === SpaceState.ERROR;
  const inactive = state === SpaceState.INACTIVE;
  const baseIntent = { plugin: SPACE_PLUGIN, data: { spaceKey: space.key.toHex() } };

  const [node] = parent.add({
    id,
    label: getSpaceDisplayName(space),
    description: space.properties.description,
    icon: (props) => <Planet {...props} />,
    data: space,
    properties: {
      role: 'branch',
      hidden: inactive,
      disabled,
      error,
      index,
      // TODO(burdon): Rename onChildMove and/or merge with onMoveNode?
      onChildrenRearrange: (child: Graph.Node<TypedObject>, nextIndex: Index) => {
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
        source: Graph.Node<TypedObject>,
        target: Graph.Node<TypedObject>,
        child: Graph.Node<TypedObject>,
        nextIndex: Index,
      ) => {
        log.info('onParentMove', { source: source.id, target: target.id, child: child.id, nextIndex });
      },
    },
  });

  node.addAction(
    {
      id: 'rename-space',
      label: ['rename space label', { ns: SPACE_PLUGIN }],
      icon: (props) => <PencilSimpleLine {...props} />,
      intent: { ...baseIntent, action: SpaceAction.RENAME },
      properties: {
        disabled: disabled || error,
      },
    },
    {
      id: 'share-space',
      label: ['share space', { ns: SPACE_PLUGIN }],
      icon: (props) => <PaperPlane {...props} />,
      intent: { ...baseIntent, action: SpaceAction.SHARE },
      properties: {
        disabled: disabled || error,
      },
    },
    {
      id: 'backup-space',
      label: ['download all docs in space label', { ns: SPACE_PLUGIN }],
      icon: (props) => <Download {...props} />,
      intent: { ...baseIntent, action: SpaceAction.BACKUP },
      properties: {
        disabled: disabled || error,
      },
    },
    {
      id: 'restore-space',
      label: ['upload all docs in space label', { ns: SPACE_PLUGIN }],
      icon: (props) => <Upload {...props} />,
      intent: { ...baseIntent, action: SpaceAction.RESTORE },
      properties: {
        disabled: disabled || error,
      },
    },
    {
      id: 'close-space',
      label: ['close space label', { ns: SPACE_PLUGIN }],
      icon: (props) => <X {...props} />,
      intent: { ...baseIntent, action: SpaceAction.CLOSE },
    },
  );

  return node;
};

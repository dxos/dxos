//
// Copyright 2023 DXOS.org
//

import { Download, EyeSlash, PaperPlane, PencilSimpleLine, Planet, Upload } from '@phosphor-icons/react';
import { getIndices } from '@tldraw/indices';
import React from 'react';

import { ClientPluginProvides } from '@braneframe/plugin-client';
import { GraphNode } from '@braneframe/plugin-graph';
import { SplitViewProvides } from '@braneframe/plugin-splitview';
import { TreeViewProvides } from '@braneframe/plugin-treeview';
import { PublicKey, PublicKeyLike } from '@dxos/keys';
import { log } from '@dxos/log';
import { ShellLayout } from '@dxos/react-client';
import { EchoDatabase, Space, SpaceState, TypedObject } from '@dxos/react-client/echo';
import { Plugin, findPlugin } from '@dxos/react-surface';

import { backupSpace } from './backup';

export const SPACE_PLUGIN = 'dxos:space';

export const isSpace = (datum: unknown): datum is Space =>
  datum && typeof datum === 'object'
    ? 'key' in datum && datum.key instanceof PublicKey && 'db' in datum && datum.db instanceof EchoDatabase
    : false;

// TODO(wittjosiah): Specify and factor out fully qualified names + utils (e.g., subpaths, uris, etc).
export const getSpaceId = (spaceKey: PublicKeyLike) => {
  if (spaceKey instanceof PublicKey) {
    spaceKey = spaceKey.truncate();
  }

  return `${SPACE_PLUGIN}/${spaceKey}`;
};

export const getSpaceDisplayName = (space: Space): string | [string, { ns: string }] => {
  const disabled = space.state.get() !== SpaceState.READY;
  return (space.properties.name?.length ?? 0) > 0
    ? space.properties.name
    : disabled
    ? ['loading space title', { ns: 'composer' }]
    : ['untitled space title', { ns: 'composer' }];
};

export const spaceToGraphNode = (space: Space, plugins: Plugin[], index: string): GraphNode<Space> => {
  const treeViewPlugin = findPlugin<TreeViewProvides>(plugins, 'dxos:treeview');
  const splitViewPlugin = findPlugin<SplitViewProvides>(plugins, 'dxos:splitview');
  const clientPlugin = findPlugin<ClientPluginProvides>(plugins, 'dxos:client');
  if (!clientPlugin) {
    throw new Error('Client plugin not found');
  }

  const client = clientPlugin.provides.client;
  const identity = client.halo.identity.get();
  const id = getSpaceId(space.key);
  const actionIndices = getIndices(5);
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
      hidden: identity && space.properties.members?.[identity.identityKey.toHex()]?.hidden === true,
      disabled: space.state.get() !== SpaceState.READY,
      error: space.state.get() === SpaceState.ERROR,
    },
    pluginActions: {
      [SPACE_PLUGIN]: [
        {
          id: 'rename-space',
          index: actionIndices[0],
          label: ['rename space label', { ns: 'composer' }],
          icon: (props) => <PencilSimpleLine {...props} />,
          invoke: async () => {
            if (splitViewPlugin?.provides.splitView) {
              splitViewPlugin.provides.splitView.dialogOpen = true;
              splitViewPlugin.provides.splitView.dialogContent = ['dxos:space/RenameSpaceDialog', space];
            }
          },
        },
        {
          id: 'view-invitations',
          index: actionIndices[1],
          label: ['view invitations label', { ns: 'composer' }],
          icon: (props) => <PaperPlane {...props} />,
          invoke: async () => {
            await clientPlugin.provides.setLayout(ShellLayout.SPACE_INVITATIONS, { spaceKey: space.key });
          },
        },
        {
          id: 'hide-space',
          index: actionIndices[2],
          label: ['hide space label', { ns: 'composer' }],
          icon: (props) => <EyeSlash {...props} />,
          invoke: async () => {
            if (identity) {
              const identityHex = identity.identityKey.toHex();
              space.properties.members = {
                ...space.properties.members,
                [identityHex]: {
                  ...space.properties.members?.[identityHex],
                  hidden: true,
                },
              };
              if (treeViewPlugin?.provides.treeView.selected[0] === id) {
                treeViewPlugin.provides.treeView.selected = [];
              }
            }
          },
        },
        {
          id: 'backup-space',
          index: actionIndices[3],
          label: ['download all docs in space label', { ns: 'composer' }],
          icon: (props) => <Download {...props} />,
          invoke: async (t) => {
            const backupBlob = await backupSpace(space, t('document title placeholder'));
            const url = URL.createObjectURL(backupBlob);
            const element = document.createElement('a');
            element.setAttribute('href', url);
            element.setAttribute('download', `${node!.label} backup.zip`);
            element.setAttribute('target', 'download');
            element.click();
          },
        },
        {
          id: 'restore-space',
          index: actionIndices[4],
          label: ['upload all docs in space label', { ns: 'composer' }],
          icon: (props) => <Upload {...props} />,
          invoke: async () => {
            if (splitViewPlugin?.provides.splitView) {
              splitViewPlugin.provides.splitView.dialogOpen = true;
              splitViewPlugin.provides.splitView.dialogContent = ['dxos:space/RestoreSpaceDialog', space];
            }
          },
        },
      ],
    },
  };

  return node;
};

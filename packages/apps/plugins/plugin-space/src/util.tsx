//
// Copyright 2023 DXOS.org
//

import {
  Article,
  ArticleMedium,
  Download,
  EyeSlash,
  PaperPlane,
  PencilSimpleLine,
  Planet,
  Trash,
  Upload,
} from '@phosphor-icons/react';
import React from 'react';

import { ClientPluginProvides } from '@braneframe/plugin-client';
import { GraphNode, GraphNodeAction } from '@braneframe/plugin-graph';
import { SplitViewProvides } from '@braneframe/plugin-splitview';
import { TreeViewProvides } from '@braneframe/plugin-treeview';
import { TextKind } from '@dxos/aurora-composer';
import { PublicKey, PublicKeyLike } from '@dxos/keys';
import { EchoDatabase, Space, TypedObject, SpaceState, ShellLayout } from '@dxos/react-client';
import { Plugin, findPlugin } from '@dxos/react-surface';

import { backupSpace } from './backup';
import { SpaceProvides } from './types';

export const SPACE_PLUGIN = 'dxos:space';

export const isSpace = (datum: unknown): datum is Space =>
  datum && typeof datum === 'object'
    ? 'key' in datum && datum.key instanceof PublicKey && 'db' in datum && datum.db instanceof EchoDatabase
    : false;

export const objectsToGraphNodes = (parent: GraphNode<Space>, objects: TypedObject[]): GraphNode[] => {
  return objects.map((obj) => ({
    id: obj.id,
    label: obj.title ?? 'Untitled',
    description: obj.description,
    icon: (props) => (obj.content?.kind === TextKind.PLAIN ? <ArticleMedium {...props} /> : <Article {...props} />),
    data: obj,
    parent,
    actions: [
      {
        id: 'delete',
        label: ['delete document label', { ns: 'composer' }],
        icon: (props) => <Trash {...props} />,
        invoke: async () => {
          parent.data?.db.remove(obj);
        },
      },
    ],
  }));
};

// TODO(wittjosiah): Specify and factor out fully qualified names + utils (e.g., subpaths, uris, etc).
export const getSpaceId = (spaceKey: PublicKeyLike) => {
  if (spaceKey instanceof PublicKey) {
    spaceKey = spaceKey.truncate();
  }

  return `${SPACE_PLUGIN}/${spaceKey}`;
};

type SpacePlugin = Plugin<SpaceProvides>;
export const spacePlugins = (plugins: Plugin[]): SpacePlugin[] => {
  return (plugins as SpacePlugin[]).filter((p) => Array.isArray(p.provides?.space?.types));
};

export const getSpaceDisplayName = (space: Space): string | [string, { ns: string }] => {
  const disabled = space.state.get() !== SpaceState.READY;
  return (space.properties.name?.length ?? 0) > 0
    ? space.properties.name
    : disabled
    ? ['loading space title', { ns: 'composer' }]
    : ['untitled space title', { ns: 'composer' }];
};

export const spaceToGraphNode = (space: Space, plugins: Plugin[]): GraphNode<Space> => {
  const treeViewPlugin = findPlugin<TreeViewProvides>(plugins, 'dxos:treeview');
  const splitViewPlugin = findPlugin<SplitViewProvides>(plugins, 'dxos:splitview');
  const clientPlugin = findPlugin<ClientPluginProvides>(plugins, 'dxos:client');
  if (!clientPlugin) {
    throw new Error('Client plugin not found');
  }

  const client = clientPlugin.provides.client;
  const identity = client.halo.identity.get();

  const id = getSpaceId(space.key);
  const spaceTypes = spacePlugins(plugins)
    .flatMap((p) => p.provides.space.types ?? [])
    .map(
      (type): GraphNodeAction => ({
        ...type,
        invoke: async () => {
          const object = space.db.add(new type.Type());
          if (treeViewPlugin) {
            treeViewPlugin.provides.treeView.selected = [id, object.id];
          }
        },
      }),
    );

  const node: GraphNode = {
    id,
    label: getSpaceDisplayName(space),
    description: space.properties.description,
    icon: (props) => <Planet {...props} />,
    data: space,
    attributes: {
      hidden: identity && space.properties.members?.[identity.identityKey.toHex()]?.hidden === true,
      disabled: space.state.get() !== SpaceState.READY,
      error: space.state.get() === SpaceState.ERROR,
    },
    pluginActions: {
      [SPACE_PLUGIN]: [
        ...spaceTypes,
        {
          id: 'rename-space',
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
          label: ['view invitations label', { ns: 'composer' }],
          icon: (props) => <PaperPlane {...props} />,
          invoke: async () => {
            await clientPlugin.provides.setLayout(ShellLayout.SPACE_INVITATIONS, { spaceKey: space.key });
          },
        },
        {
          id: 'hide-space',
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
          label: ['download all docs in space label', { ns: 'composer' }],
          icon: (props) => <Download {...props} />,
          invoke: async (t) => {
            const backupBlob = await backupSpace(space, t('untitled document title'));
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

  const typeNames = new Set(
    spacePlugins(plugins)
      .flatMap((p) => p.provides.space.types ?? [])
      .map((type) => type.Type.type.name),
  );
  const query = space.db.query((obj: TypedObject) => {
    return typeNames.has(obj.__typename);
  });
  node.pluginChildren = { [SPACE_PLUGIN]: objectsToGraphNodes(node, query.objects) };

  // let children = rootObjects.get(id);
  // if (!children) {
  //   const typeNames = new Set(
  //     spacePlugins(plugins)
  //       .flatMap((p) => p.provides.space.types ?? [])
  //       .map((type) => type.Type.type.name),
  //   );
  //   const query = space.db.query((obj: TypedObject) => {
  //     return typeNames.has(obj.__typename);
  //   });
  //   const objects = createStore(objectsToGraphNodes(node, query.objects));
  //   subscriptions.add(
  //     query.subscribe((query) => {
  //       objects.splice(0, objects.length, ...objectsToGraphNodes(node!, query.objects));
  //     }),
  //   );

  //   children = objects;
  //   rootObjects.set(id, children);
  // }
  // node.children = children ?? [];

  return node;
};

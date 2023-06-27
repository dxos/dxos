//
// Copyright 2023 DXOS.org
//

import {
  ArrowLineLeft,
  Article,
  ArticleMedium,
  Download,
  EyeSlash,
  Intersect,
  PaperPlane,
  PencilSimpleLine,
  Planet,
  Plus,
  Trash,
  Upload,
} from '@phosphor-icons/react';

import { ClientPluginProvides } from '@braneframe/plugin-client';
import { GraphNode, GraphProvides, GraphPluginProvides, isGraphNode } from '@braneframe/plugin-graph';
import { SplitViewProvides } from '@braneframe/plugin-splitview';
import { TranslationsProvides } from '@braneframe/plugin-theme';
import { TreeViewProvides } from '@braneframe/plugin-treeview';
import { Document } from '@braneframe/types';
import { EventSubscriptions } from '@dxos/async';
import { TextKind } from '@dxos/aurora-composer';
import { PublicKey, PublicKeyLike } from '@dxos/keys';
import { createStore, createSubscription } from '@dxos/observable-object';
import {
  EchoDatabase,
  IFrameClientServicesHost,
  IFrameClientServicesProxy,
  ShellLayout,
  Space,
  SpaceState,
  TypedObject,
} from '@dxos/react-client';
import { PluginDefinition, findPlugin } from '@dxos/react-surface';

import { backupSpace } from './backup';
import { DialogRenameSpace, DialogRestoreSpace, EmptySpace, EmptyTree, SpaceMain, SpaceMainEmpty } from './components';
import { getSpaceDisplayName } from './getSpaceDisplayName';
import translations from './translations';

const SPACE_PLUGIN = 'dxos:space';

export const isSpace = (datum: unknown): datum is Space =>
  datum && typeof datum === 'object'
    ? 'key' in datum && datum.key instanceof PublicKey && 'db' in datum && datum.db instanceof EchoDatabase
    : false;

const objectsToGraphNodes = (parent: GraphNode<Space>, objects: TypedObject[]): GraphNode[] => {
  return objects.map((obj) => ({
    id: obj.id,
    label: obj.title ?? 'Untitled',
    description: obj.description,
    icon: obj.content?.kind === TextKind.PLAIN ? ArticleMedium : Article,
    data: obj,
    parent,
    actions: [
      {
        id: 'delete',
        label: ['delete document label', { ns: 'composer' }],
        icon: Trash,
        invoke: async () => {
          parent.data?.db.remove(obj);
        },
      },
    ],
  }));
};

// TODO(wittjosiah): Specify and factor out fully qualified names + utils (e.g., subpaths, uris, etc).
const getSpaceId = (spaceKey: PublicKeyLike) => {
  if (spaceKey instanceof PublicKey) {
    spaceKey = spaceKey.truncate();
  }

  return `${SPACE_PLUGIN}/${spaceKey}`;
};

export type SpacePluginProvides = GraphProvides & TranslationsProvides;

export const SpacePlugin = (): PluginDefinition<SpacePluginProvides> => {
  const nodes = createStore<GraphNode<Space>[]>([]);
  const rootNodes = new Map<string, GraphNode<Space>>();
  const nodeAttributes = new Map<string, { [key: string]: any }>();
  const rootObjects = new Map<string, GraphNode[]>();
  const subscriptions = new EventSubscriptions();

  return {
    meta: {
      id: SPACE_PLUGIN,
    },
    ready: async (plugins) => {
      const clientPlugin = findPlugin<ClientPluginProvides>(plugins, 'dxos:ClientPlugin');
      const treeViewPlugin = findPlugin<TreeViewProvides>(plugins, 'dxos:TreeViewPlugin');
      const graphPlugin = findPlugin<GraphPluginProvides>(plugins, 'dxos:GraphPlugin');
      const splitViewPlugin = findPlugin<SplitViewProvides>(plugins, 'dxos:SplitViewPlugin');
      if (!clientPlugin) {
        return;
      }

      const client = clientPlugin.provides.client;
      const identity = client.halo.identity.get();
      const subscription = client.spaces.subscribe((spaces) => {
        nodes.splice(
          0,
          nodes.length,
          ...spaces.map((space) => {
            const id = getSpaceId(space.key);
            let node = rootNodes.get(id);
            if (node) {
              node.label = getSpaceDisplayName(space);
              node.description = space.properties.description;
            } else {
              node = createStore<GraphNode<Space>>({
                id,
                label: getSpaceDisplayName(space),
                description: space.properties.description,
                icon: Planet,
                data: space,
                actions: [
                  {
                    id: 'create-doc',
                    testId: 'spacePlugin.createDocument',
                    label: ['create document label', { ns: 'composer' }],
                    icon: Plus,
                    invoke: async () => {
                      const document = space.db.add(new Document());
                      if (treeViewPlugin) {
                        treeViewPlugin.provides.treeView.selected = [id, document.id];
                      }
                    },
                  },
                  {
                    id: 'rename-space',
                    label: ['rename space label', { ns: 'composer' }],
                    icon: PencilSimpleLine,
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
                    icon: PaperPlane,
                    invoke: async () => {
                      await clientPlugin.provides.setLayout(ShellLayout.SPACE_INVITATIONS, { spaceKey: space.key });
                    },
                  },
                  {
                    id: 'hide-space',
                    label: ['hide space label', { ns: 'composer' }],
                    icon: EyeSlash,
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
                    icon: Download,
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
                    icon: Upload,
                    invoke: async () => {
                      if (splitViewPlugin?.provides.splitView) {
                        splitViewPlugin.provides.splitView.dialogOpen = true;
                        splitViewPlugin.provides.splitView.dialogContent = ['dxos:space/RestoreSpaceDialog', space];
                      }
                    },
                  },
                ],
              });
              rootNodes.set(id, node);
            }

            let attributes = nodeAttributes.get(id);
            if (!attributes) {
              attributes = createStore<{ hidden: boolean }>();
              const handle = createSubscription(() => {
                if (!identity) {
                  return;
                }
                attributes!.hidden = space.properties.members?.[identity.identityKey.toHex()]?.hidden === true;
                node!.label = getSpaceDisplayName(space);
                node!.description = space.properties.description;
              });
              handle.update([space.properties]);
              subscriptions.add(handle.unsubscribe);
            }
            attributes.disabled = space.state.get() !== SpaceState.READY;
            attributes.error = space.state.get() === SpaceState.ERROR;
            node.attributes = attributes ?? {};

            let children = rootObjects.get(id);
            if (!children) {
              const query = space.db.query(Document.filter());
              const objects = createStore(objectsToGraphNodes(node, query.objects));
              subscriptions.add(
                query.subscribe((query) => {
                  objects.splice(0, objects.length, ...objectsToGraphNodes(node!, query.objects));
                }),
              );

              children = objects;
              rootObjects.set(id, children);
            }
            node.children = children ?? [];

            return node;
          }),
        );
      });

      subscriptions.add(subscription.unsubscribe);

      if (!treeViewPlugin) {
        return;
      }

      const treeView = treeViewPlugin.provides.treeView;

      if (client.services instanceof IFrameClientServicesProxy || client.services instanceof IFrameClientServicesHost) {
        client.services.joinedSpace.on((spaceKey) => {
          treeView.selected = [getSpaceId(spaceKey)];
        });
      }

      const nodeHandle = createSubscription(() => {
        const space: Space = graphPlugin?.provides.graph.roots[SPACE_PLUGIN]?.find(
          (node) => node.id === treeView.selected[0],
        )?.data;
        if (
          space &&
          (client.services instanceof IFrameClientServicesProxy || client.services instanceof IFrameClientServicesHost)
        ) {
          client.services.setSpaceProvider(() => space.key);
        }
      });
      nodeHandle.update([treeView]);
      subscriptions.add(nodeHandle.unsubscribe);
    },
    unload: async () => {
      subscriptions.clear();
    },
    provides: {
      translations,
      component: (datum, role) => {
        switch (role) {
          case 'main':
            switch (true) {
              case isSpace(datum):
                return SpaceMainEmpty;
              default:
                return null;
            }
          case 'tree--empty':
            switch (true) {
              case datum === SPACE_PLUGIN:
                return EmptyTree;
              case isGraphNode(datum) && isSpace(datum?.data):
                return EmptySpace;
              default:
                return null;
            }
          case 'dialog':
            if (Array.isArray(datum)) {
              switch (datum[0]) {
                case 'dxos:space/RenameSpaceDialog':
                  return DialogRenameSpace;
                case 'dxos:space/RestoreSpaceDialog':
                  return DialogRestoreSpace;
                default:
                  return null;
              }
            } else {
              return null;
            }
          default:
            return null;
        }
      },
      components: {
        Main: SpaceMain,
      },
      graph: {
        nodes: () => nodes,
        actions: (plugins) => {
          const clientPlugin = findPlugin<ClientPluginProvides>(plugins, 'dxos:ClientPlugin');
          const splitViewPlugin = findPlugin<SplitViewProvides>(plugins, 'dxos:SplitViewPlugin');
          if (!clientPlugin) {
            return [];
          }

          // TODO(wittjosiah): Disable if no identity.
          return [
            {
              id: 'create-space',
              testId: 'spacePlugin.createSpace',
              label: ['create space label', { ns: 'os' }],
              icon: Planet,
              invoke: async () => {
                await clientPlugin.provides.client.createSpace();
              },
            },
            {
              id: 'join-space',
              testId: 'spacePlugin.joinSpace',
              label: ['join space label', { ns: 'os' }],
              icon: Intersect,
              invoke: async () => {
                await clientPlugin.provides.setLayout(ShellLayout.JOIN_SPACE);
              },
            },
            {
              // TODO(wittjosiah): Move to SplitViewPlugin.
              id: 'close-sidebar',
              label: ['close sidebar label', { ns: 'os' }],
              icon: ArrowLineLeft,
              invoke: async () => {
                if (splitViewPlugin?.provides.splitView) {
                  splitViewPlugin.provides.splitView.sidebarOpen = false;
                }
              },
            },
          ];
        },
      },
    },
  };
};

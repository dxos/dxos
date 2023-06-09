//
// Copyright 2023 DXOS.org
//

import { ArrowLineLeft, EyeSlash, Intersect, PaperPlane, PencilSimple, Planet, Plus } from '@phosphor-icons/react';
import { FC, useEffect } from 'react';
import React, { useNavigate, useParams } from 'react-router';

import { Document } from '@braneframe/types';
import { EventSubscriptions } from '@dxos/async';
import { createStore, createSubscription } from '@dxos/observable-object';
import { observer } from '@dxos/observable-object/react';
import {
  EchoDatabase,
  IFrameClientServicesHost,
  IFrameClientServicesProxy,
  PublicKey,
  ShellLayout,
  Space,
  SpaceProxy,
  TypedObject,
} from '@dxos/react-client';

import { Surface, definePlugin, findPlugin } from '../../framework';
import { ClientPluginProvides } from '../ClientPlugin';
import { isDocument } from '../GithubMarkdownPlugin';
import { GraphNode, GraphProvides, useGraphContext } from '../GraphPlugin';
import { RouterPluginProvides } from '../RoutesPlugin';
import { SplitViewProvides } from '../SplitViewPlugin';
import { TreeViewProvides, useTreeView } from '../TreeViewPlugin';
import { DialogRenameSpace } from './DialogRenameSpace';
import { DocumentLinkTreeItem } from './DocumentLinkTreeItem';
import { FullSpaceTreeItem } from './FullSpaceTreeItem';

export type SpacePluginProvides = GraphProvides & RouterPluginProvides;

export const isSpace = (datum: unknown): datum is Space =>
  datum && typeof datum === 'object'
    ? 'key' in datum && datum.key instanceof PublicKey && 'db' in datum && datum.db instanceof EchoDatabase
    : false;

export const SpaceMain: FC<{}> = observer(() => {
  const treeView = useTreeView();
  const graph = useGraphContext();
  const [parentId, childId] = treeView.selected;

  const parentNode = graph.roots[SpacePlugin.meta.id].find((node) => node.id === parentId);
  const childNode = parentNode?.children?.find((node) => node.id === childId);

  const data = parentNode ? (childNode ? [parentNode.data, childNode.data] : [parentNode.data]) : null;
  return data ? <Surface data={data} role='main' /> : <p>…</p>;
});

const objectsToGraphNodes = (parent: GraphNode<Space>, objects: TypedObject[]): GraphNode[] => {
  return objects.map((obj) => ({
    id: obj.id,
    label: obj.title ?? 'Untitled',
    description: obj.description,
    icon: obj.icon,
    data: obj,
    parent,
    actions: [
      {
        id: 'delete',
        label: 'Delete',
        invoke: async () => {
          parent.data?.db.remove(obj);
        },
      },
    ],
  }));
};

const nodes = createStore<GraphNode[]>([]);
const nodeAttributes = new Map<string, { [key: string]: any }>();
const rootObjects = new Map<string, GraphNode[]>();
const subscriptions = new EventSubscriptions();

export const SpacePlugin = definePlugin<SpacePluginProvides>({
  meta: {
    id: 'dxos:SpacePlugin',
  },
  ready: async (plugins) => {
    const clientPlugin = findPlugin<ClientPluginProvides>(plugins, 'dxos:ClientPlugin');
    const treeViewPlugin = findPlugin<TreeViewProvides>(plugins, 'dxos:TreeViewPlugin');
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
          const id = space.key.toHex();
          const node: GraphNode<Space> = {
            id,
            label: space.properties.name ?? 'Untitled space',
            description: space.properties.description,
            icon: Planet,
            data: space,
            actions: [
              {
                id: 'create-doc',
                label: 'Create document',
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
                label: 'Rename space',
                icon: PencilSimple,
                invoke: async () => {
                  if (splitViewPlugin?.provides.splitView) {
                    splitViewPlugin.provides.splitView.dialogOpen = true;
                    splitViewPlugin.provides.splitView.dialogContent = ['dxos:SpacePlugin/RenameSpaceDialog', space];
                  }
                },
              },
              {
                id: 'view-invitations',
                label: 'View invitations',
                icon: PaperPlane,
                invoke: async () => {
                  await clientPlugin.provides.setLayout(ShellLayout.SPACE_INVITATIONS, { spaceKey: space.key });
                },
              },
              {
                id: 'hide-space',
                label: 'Hide space',
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
            ],
          };

          let attributes = nodeAttributes.get(id);
          if (!attributes) {
            attributes = createStore<{ hidden: boolean }>();
            const handle = createSubscription(() => {
              if (!identity) {
                return;
              }
              attributes!.hidden = space.properties.members?.[identity.identityKey.toHex()]?.hidden === true;
            });
            handle.update([space.properties]);
            subscriptions.add(handle.unsubscribe);
          }
          node.attributes = attributes ?? {};

          let children = rootObjects.get(id);
          if (!children) {
            const query = space.db.query(Document.filter());
            const objects = createStore(objectsToGraphNodes(node, query.objects));
            subscriptions.add(
              query.subscribe((query) => {
                objects.splice(0, objects.length, ...objectsToGraphNodes(node, query.objects));
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
        treeView.selected = [spaceKey.toHex()];
      });
    }

    const nodeHandle = createSubscription(() => {
      const [id] = treeView.selected ?? [];
      if (client.services instanceof IFrameClientServicesProxy || client.services instanceof IFrameClientServicesHost) {
        client.services.setSpaceProvider(() => PublicKey.safeFrom(id));
      }
    });
    nodeHandle.update([treeView]);
    subscriptions.add(nodeHandle.unsubscribe);
  },
  unload: async () => {
    subscriptions.clear();
  },
  provides: {
    router: {
      routes: () => [
        {
          path: '/space/:spaceId',
          element: (
            <Surface
              component='dxos:SplitViewPlugin/SplitView'
              surfaces={{
                sidebar: { component: 'dxos:TreeViewPlugin/TreeView' },
                main: { component: 'dxos:SpacePlugin/SpaceMain' },
              }}
            />
          ),
        },
        {
          path: '/space/:spaceId/:objectId',
          element: (
            <Surface
              component='dxos:SplitViewPlugin/SplitView'
              surfaces={{
                sidebar: { component: 'dxos:TreeViewPlugin/TreeView' },
                main: { component: 'dxos:SpacePlugin/SpaceMain' },
              }}
            />
          ),
        },
      ],
      useNavigator: () => {
        // TODO(wittjosiah): Should come from plugin provides.
        const navigate = useNavigate();
        const params = useParams();
        const { spaceId, objectId } = params;
        const treeView = useTreeView();

        useEffect(() => {
          const handle = createSubscription(() => {
            if (treeView.selected.length > 0) {
              return;
            }

            const space = nodes.find((node) => node.id === spaceId);
            const object = space?.children?.find((node) => {
              return node.id === objectId;
            });
            const node = space && object ? [space.id, object.id] : null;
            if (node) {
              treeView.selected = node;
            }
          });
          handle.update([treeView, nodes]);

          return () => handle.unsubscribe();
        }, [treeView, nodes, spaceId, objectId]);

        useEffect(() => {
          if (!treeView.selected.length) {
            return;
          }

          // TODO(wittjosiah): Check if space.
          if (treeView.selected.length === 1 && treeView.selected[0] !== spaceId) {
            navigate(`/space/${treeView.selected[0]}`);
          }

          // TODO(wittjosiah): Check if object.
          if (treeView.selected.length === 2 && treeView.selected[1] !== objectId) {
            navigate(`/space/${treeView.selected[0]}/${treeView.selected[1]}`);
          }
        }, [treeView.selected, spaceId, objectId]);
      },
    },
    component: (datum, role) => {
      switch (role) {
        case 'main':
          switch (true) {
            case isSpace(datum):
              return () => <pre>{JSON.stringify((datum as SpaceProxy).properties)}</pre>;
            default:
              return null;
          }
        case 'treeitem':
          switch (true) {
            case isSpace(datum?.data):
              return FullSpaceTreeItem;
            case isDocument(datum?.data):
              return DocumentLinkTreeItem;
            default:
              return null;
          }
        case 'dialog':
          switch (true) {
            case Array.isArray(datum) && datum[0] === 'dxos:SpacePlugin/RenameSpaceDialog':
              return DialogRenameSpace;
            default:
              return null;
          }
        default:
          return null;
      }
    },
    components: {
      SpaceMain,
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
            label: 'Create space',
            icon: Planet,
            invoke: async () => {
              await clientPlugin.provides.client.createSpace();
            },
          },
          {
            id: 'join-space',
            label: 'Join space',
            icon: Intersect,
            invoke: async () => {
              await clientPlugin.provides.setLayout(ShellLayout.JOIN_SPACE);
            },
          },
          {
            id: 'close-sidebar',
            label: 'Close sidebar',
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
});

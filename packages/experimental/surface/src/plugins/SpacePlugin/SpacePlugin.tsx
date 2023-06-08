//
// Copyright 2023 DXOS.org
//

import { Planet } from '@phosphor-icons/react';
import { FC, useEffect } from 'react';
import React, { useNavigate, useParams } from 'react-router';

import { Document } from '@braneframe/types';
import { EventSubscriptions } from '@dxos/async';
import { createStore } from '@dxos/observable-object';
import { observer } from '@dxos/observable-object/react';
import { EchoDatabase, PublicKey, Space, SpaceProxy, TypedObject } from '@dxos/react-client';

import { Surface, definePlugin, findPlugin } from '../../framework';
import { ClientPluginProvides } from '../ClientPlugin';
import { isDocument } from '../GithubMarkdownPlugin';
import { GraphNode, GraphPluginProvides, useGraphContext } from '../GraphPlugin';
import { RouterPluginProvides } from '../RoutesPlugin';
import { useTreeView } from '../TreeViewPlugin';
import { DocumentLinkTreeItem } from './DocumentLinkTreeItem';
import { FullSpaceTreeItem } from './FullSpaceTreeItem';

export type SpacePluginProvides = GraphPluginProvides & RouterPluginProvides;

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
const rootObjects = new Map<string, GraphNode[]>();
const subscriptions = new EventSubscriptions();

export const SpacePlugin = definePlugin<SpacePluginProvides>({
  meta: {
    id: 'dxos:SpacePlugin',
  },
  ready: async (plugins) => {
    const clientPlugin = findPlugin<ClientPluginProvides>(plugins, 'dxos:ClientPlugin');
    if (clientPlugin) {
      const subscription = clientPlugin.provides.client.spaces.subscribe((spaces) => {
        nodes.splice(
          0,
          nodes.length,
          ...spaces.map((space) => {
            const node: GraphNode<Space> = {
              id: space.key.toHex(),
              label: space.properties.name ?? 'Untitled space',
              description: space.properties.description,
              icon: Planet,
              data: space,
              actions: [],
            };

            let children = rootObjects.get(node.id);

            if (!children) {
              const query = space.db.query(Document.filter());
              const objects = createStore(objectsToGraphNodes(node, query.objects));
              subscriptions.add(
                query.subscribe((query) => {
                  objects.splice(0, objects.length, ...objectsToGraphNodes(node, query.objects));
                }),
              );

              children = objects;
              rootObjects.set(node.id, children);
            }

            node.children = children?.map((child) => ({ ...child, parent: node })) ?? [];

            return node;
          }),
        );
      });
      subscriptions.add(subscription.unsubscribe);
    }
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
          if (!treeView.selected.length) {
            const space = nodes.find((node) => node.id === spaceId);
            const object = space?.children?.find((node) => node.id === objectId);
            const node = space ? (object ? [space.id, object.id] : [space.id]) : null;
            if (node) {
              treeView.selected = node;
            }
          }
        }, [treeView.selected, spaceId, objectId]);

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
      }
    },
    components: {
      SpaceMain,
    },
    graph: {
      nodes: () => nodes,
      actions: (plugins) => {
        const clientPlugin = findPlugin<ClientPluginProvides>(plugins, 'dxos:ClientPlugin');
        if (!clientPlugin) {
          return [];
        }

        // TODO(wittjosiah): Disable if no identity.
        return [
          {
            id: 'dxos:CreateSpace',
            label: 'Create space',
            invoke: async () => {
              await clientPlugin.provides.client.createSpace();
            },
          },
        ];
      },
    },
  },
});

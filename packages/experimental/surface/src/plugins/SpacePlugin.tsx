//
// Copyright 2023 DXOS.org
//

import { Planet } from '@phosphor-icons/react';
import { useEffect } from 'react';
import React, { useNavigate, useParams } from 'react-router';

import { Document } from '@braneframe/types';
import { EventSubscriptions } from '@dxos/async';
import { TFunction } from '@dxos/aurora';
import { createStore } from '@dxos/observable-object';
import { EchoDatabase, PublicKey, Space, SpaceProxy, TypedObject, isTypedObject } from '@dxos/react-client';

import { Surface, definePlugin, findPlugin } from '../framework';
import { ClientPluginProvides } from './ClientPlugin';
import { GraphNode, GraphPluginProvides } from './GraphPlugin';
import { RouterPluginProvides } from './RoutesPlugin';
import { useTreeView } from './TreeViewPlugin';

export type SpacePluginProvides = GraphPluginProvides & RouterPluginProvides;

export const getSpaceDisplayName = (t: TFunction, space: Space, disabled?: boolean) => {
  return (space.properties.name?.length ?? 0) > 0
    ? space.properties.name
    : disabled
    ? t('loading space title')
    : t('untitled space title');
};

export const isSpace = (datum: unknown): datum is Space =>
  datum && typeof datum === 'object'
    ? 'key' in datum && datum.key instanceof PublicKey && 'db' in datum && datum.db instanceof EchoDatabase
    : false;

export const SpaceMain = () => {
  const { selected } = useTreeView();
  return selected ? <Surface data={[selected.data, selected.parent?.data]} role='main' /> : <p>…</p>;
};

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
        const { selected, setSelected } = useTreeView();

        useEffect(() => {
          if (!selected) {
            const space = nodes.find((node) => node.id === spaceId);
            const object = space?.children?.find((node) => node.id === objectId);
            const node = object ?? space;
            node && setSelected(node);
          }
        }, [selected, spaceId, objectId]);

        useEffect(() => {
          if (!selected) {
            return;
          }

          if (isSpace(selected.data) && selected.id !== spaceId) {
            navigate(`/space/${selected.id}`);
          }

          if (isTypedObject(selected.data) && selected.parent && selected.id !== objectId) {
            navigate(`/space/${selected.parent.id}/${selected.id}`);
          }
        }, [selected, spaceId, objectId]);
      },
    },
    component: (datum, role) => {
      if (role === 'main') {
        switch (true) {
          case isSpace(datum):
            return () => <pre>{JSON.stringify((datum as SpaceProxy).properties)}</pre>;
          default:
            return null;
        }
      } else {
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

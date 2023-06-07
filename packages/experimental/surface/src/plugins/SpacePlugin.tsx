//
// Copyright 2023 DXOS.org
//

import React, { useParams } from 'react-router';

import { createStore } from '@dxos/observable-object';
import { Space, useSpace } from '@dxos/react-client';

import { Surface, definePlugin, findPlugin } from '../framework';
import { ClientPluginProvides } from './ClientPlugin';
import { GraphNode, GraphPluginProvides } from './ListViewPlugin';
import { RouterPluginProvides } from './RoutesPlugin';

export type SpacePluginProvides = GraphPluginProvides & RouterPluginProvides;

export const isSpace = (datum: any): datum is Space => 'key' in datum && 'db' in datum;

export const SpaceMain = () => {
  const { spaceId } = useParams();
  const space = useSpace(spaceId);
  return space ? <Surface data={space} role='main' /> : <p>…</p>;
};

const nodes = createStore<GraphNode[]>([]);
let subscription: ZenObservable.Subscription | undefined;

export const SpacePlugin = definePlugin<SpacePluginProvides>({
  meta: {
    id: 'dxos:SpacePlugin',
  },
  ready: async (plugins) => {
    const clientPlugin = findPlugin<ClientPluginProvides>(plugins, 'dxos:ClientPlugin');
    if (clientPlugin) {
      subscription = clientPlugin.provides.client.spaces.subscribe((spaces) => {
        nodes.splice(
          0,
          nodes.length,
          ...spaces.map((space) => ({ id: space.key.toHex(), label: space.properties.name ?? 'Untitled space' })),
        );
      });
    }
  },
  unload: async () => {
    subscription?.unsubscribe();
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
                sidebar: { component: 'dxos:ListViewPlugin/ListView' },
                main: { component: 'dxos:SpacePlugin/SpaceMain' },
              }}
            />
          ),
        },
      ],
    },
    components: {
      SpaceMain,
    },
    graph: {
      nodes: (plugins, parent) => {
        if (parent) {
          return [];
        }

        return nodes;
      },
      actions: (plugins, parent) => {
        const clientPlugin = findPlugin<ClientPluginProvides>(plugins, 'dxos:ClientPlugin');
        if (!clientPlugin) {
          return [];
        }

        if (parent) {
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

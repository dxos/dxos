//
// Copyright 2023 DXOS.org
//

import React, { useParams } from 'react-router';

import { createStore } from '@dxos/observable-object';
import { useSpace } from '@dxos/react-client';

import { Surface, definePlugin, findPlugin } from '../framework';
import { ClientPluginProvides } from './ClientPlugin';
import { GraphNode, GraphPluginProvides } from './ListViewPlugin';
import { RouterPluginProvides } from './RoutesPlugin';

export type SpacePluginProvides = GraphPluginProvides & RouterPluginProvides;

export const SpaceContainer = () => {
  const { spaceId } = useParams();
  const space = useSpace(spaceId);
  return <pre>{JSON.stringify(space?.properties)}</pre>;
};

const nodes = createStore<GraphNode[]>([]);
let subscription: ZenObservable.Subscription | undefined;

export const SpacePlugin = definePlugin<SpacePluginProvides>({
  meta: {
    id: 'dxos:SpacePlugin',
  },
  init: async (plugins) => {
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

    return {};
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
                main: { component: 'dxos:SpacePlugin/SpaceContainer' },
              }}
            />
          ),
        },
      ],
    },
    components: {
      SpaceContainer,
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

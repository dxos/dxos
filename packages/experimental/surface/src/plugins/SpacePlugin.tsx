//
// Copyright 2023 DXOS.org
//

import { useEffect } from 'react';
import React, { useNavigate, useParams } from 'react-router';

import { createStore } from '@dxos/observable-object';
import { EchoDatabase, PublicKey, Space, useSpace } from '@dxos/react-client';

import { Surface, definePlugin, findPlugin } from '../framework';
import { ClientPluginProvides } from './ClientPlugin';
import { GraphNode, GraphPluginProvides } from './GraphPlugin';
import { useListViewContext } from './ListViewPlugin';
import { RouterPluginProvides } from './RoutesPlugin';

export type SpacePluginProvides = GraphPluginProvides & RouterPluginProvides;

export const isSpace = (datum: any): datum is Space =>
  'key' in datum && datum.key instanceof PublicKey && 'db' in datum && datum.db instanceof EchoDatabase;

export const SpaceMain = () => {
  const { selected } = useListViewContext();
  const space = useSpace(selected?.id);
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
      default: () => {
        // TODO(wittjosiah): Should come from plugin provides.
        const navigate = useNavigate();
        const { spaceId } = useParams();
        const { selected, setSelected } = useListViewContext();

        useEffect(() => {
          if (!selected && spaceId) {
            const node = nodes.find((node) => node.id === spaceId);
            node && setSelected(node);
          }
        }, []);

        useEffect(() => {
          if (!selected) {
            return;
          }

          if (selected.id !== spaceId) {
            navigate(`/space/${selected.id}`);
          }
        }, [selected, spaceId]);

        return null;
      },
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

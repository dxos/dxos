//
// Copyright 2023 DXOS.org
//

import React, { useParams } from 'react-router';

import { useSpace } from '@dxos/react-client';

import { definePlugin, findPlugin } from '../framework';
import { ClientPluginProvides } from './ClientPlugin';
import { GraphPluginProvides } from './ListViewPlugin';

export const SpaceContainer = () => {
  const { spaceId } = useParams();
  const space = useSpace(spaceId);
  return <pre>{JSON.stringify(space?.properties)}</pre>;
};

export const SpacePlugin = definePlugin<GraphPluginProvides>({
  meta: {
    id: 'dxos:SpacePlugin'
  },
  provides: {
    components: {
      SpaceContainer
    },
    graph: {
      nodes: (plugins, parent) => {
        const clientPlugin = findPlugin<ClientPluginProvides>(plugins, 'dxos:ClientPlugin');
        if (!clientPlugin) {
          return [];
        }

        if (parent) {
          return [];
        }

        return clientPlugin.provides.client.spaces.get().map((space) => ({
          id: space.key.toHex(),
          label: space.properties.name ?? 'Untitled space'
        }));
      },
      actions: (plugins, parent) => {
        const clientPlugin = findPlugin<ClientPluginProvides>(plugins, 'dxos:ClientPlugin');
        if (!clientPlugin) {
          return [];
        }

        if (parent) {
          return [];
        }

        return [
          {
            id: 'dxos:CreateSpace',
            label: 'Create space',
            invoke: async () => {
              const space = await clientPlugin.provides.client.createSpace();
              console.log(space);
            }
          }
        ];
      }
    }
  }
});

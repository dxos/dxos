//
// Copyright 2023 DXOS.org
//

import { Plus } from '@phosphor-icons/react';
import React from 'react';

import { GraphNodeAdapter, SpaceAction } from '@braneframe/plugin-space';
import { SplitViewAction } from '@braneframe/plugin-splitview';
import { SpaceProxy, Expando, TypedObject } from '@dxos/client/echo';
import { PluginDefinition } from '@dxos/react-surface';

import { MapMain } from './components';
import translations from './translations';
import { isObject, MAP_PLUGIN, MapAction, MapPluginProvides } from './types';
import { objectToGraphNode } from './util';

// TODO(wittjosiah): This ensures that typed objects are not proxied by deepsignal. Remove.
// https://github.com/luisherranz/deepsignal/issues/36
(globalThis as any)[Expando.name] = Expando;

export const MapPlugin = (): PluginDefinition<MapPluginProvides> => {
  const adapter = new GraphNodeAdapter({
    filter: (object: TypedObject) => isObject(object),
    adapter: objectToGraphNode,
  });

  return {
    meta: {
      id: MAP_PLUGIN,
    },
    unload: async () => {
      adapter.clear();
    },
    provides: {
      translations,
      graph: {
        nodes: (parent) => {
          if (!(parent.data instanceof SpaceProxy)) {
            return;
          }

          const space = parent.data;

          parent.addAction({
            id: `${MAP_PLUGIN}/create`,
            label: ['create object label', { ns: MAP_PLUGIN }],
            icon: (props) => <Plus {...props} />,
            intent: [
              {
                plugin: MAP_PLUGIN,
                action: MapAction.CREATE,
              },
              {
                action: SpaceAction.ADD_OBJECT,
                data: { spaceKey: parent.data.key.toHex() },
              },
              {
                action: SplitViewAction.ACTIVATE,
              },
            ],
            properties: {
              testId: 'mapPlugin.createMap',
            },
          });

          return adapter.createNodes(space, parent);
        },
      },
      component: (data, role) => {
        if (!data || typeof data !== 'object') {
          return null;
        }

        switch (role) {
          case 'main': {
            return isObject(data) ? MapMain : null;
          }
        }

        return null;
      },
      intent: {
        resolver: (intent) => {
          switch (intent.action) {
            case MapAction.CREATE: {
              return { object: new Expando({ type: 'map' }) };
            }
          }
        },
      },
    },
  };
};

//
// Copyright 2023 DXOS.org
//

import { Plus } from '@phosphor-icons/react';
import React from 'react';

import { type IntentPluginProvides } from '@braneframe/plugin-intent';
import { LayoutAction } from '@braneframe/plugin-layout';
import { GraphNodeAdapter, SpaceAction } from '@braneframe/plugin-space';
import { findPlugin, type PluginDefinition } from '@dxos/app-framework';
import { SpaceProxy, Expando, type TypedObject } from '@dxos/client/echo';

import { MapMain } from './components';
import translations from './translations';
import { isObject, MAP_PLUGIN, MapAction, type MapPluginProvides } from './types';
import { objectToGraphNode } from './util';

// TODO(wittjosiah): This ensures that typed objects are not proxied by deepsignal. Remove.
// https://github.com/luisherranz/deepsignal/issues/36
(globalThis as any)[Expando.name] = Expando;

export const MapPlugin = (): PluginDefinition<MapPluginProvides> => {
  let adapter: GraphNodeAdapter<TypedObject> | undefined;
  return {
    meta: {
      id: MAP_PLUGIN,
    },
    ready: async (plugins) => {
      const intentPlugin = findPlugin<IntentPluginProvides>(plugins, 'dxos.org/plugin/intent');
      const dispatch = intentPlugin?.provides?.intent?.dispatch;
      if (dispatch) {
        adapter = new GraphNodeAdapter({
          dispatch,
          filter: (object: TypedObject) => isObject(object),
          adapter: objectToGraphNode,
        });
      }
    },
    unload: async () => {
      adapter?.clear();
    },
    provides: {
      translations,
      graph: {
        withPlugins: (plugins) => (parent) => {
          if (!(parent.data instanceof SpaceProxy)) {
            return;
          }

          const space = parent.data;
          const intentPlugin = findPlugin<IntentPluginProvides>(plugins, 'dxos.org/plugin/intent');

          parent.addAction({
            id: `${MAP_PLUGIN}/create`,
            label: ['create object label', { ns: MAP_PLUGIN }],
            icon: (props) => <Plus {...props} />,
            invoke: () =>
              intentPlugin?.provides.intent.dispatch([
                {
                  plugin: MAP_PLUGIN,
                  action: MapAction.CREATE,
                },
                {
                  action: SpaceAction.ADD_OBJECT,
                  data: { spaceKey: parent.data.key.toHex() },
                },
                {
                  action: LayoutAction.ACTIVATE,
                },
              ]),
            properties: {
              testId: 'mapPlugin.createObject',
            },
          });

          return adapter?.createNodes(space, parent);
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

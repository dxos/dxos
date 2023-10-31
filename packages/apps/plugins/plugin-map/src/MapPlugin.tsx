//
// Copyright 2023 DXOS.org
//

import { Compass } from '@phosphor-icons/react';
import React from 'react';

import { GraphNodeAdapter, SpaceAction } from '@braneframe/plugin-space';
import { resolvePlugin, type PluginDefinition, parseIntentPlugin, LayoutAction } from '@dxos/app-framework';
import { SpaceProxy, Expando, type TypedObject, Filter } from '@dxos/client/echo';

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
      const intentPlugin = resolvePlugin(plugins, parseIntentPlugin);
      const dispatch = intentPlugin?.provides?.intent?.dispatch;
      if (dispatch) {
        adapter = new GraphNodeAdapter({
          dispatch,
          filter: Filter.from((object: TypedObject) => isObject(object)),
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
        builder: ({ parent, plugins }) => {
          if (!(parent.data instanceof SpaceProxy)) {
            return;
          }

          const space = parent.data;
          const intentPlugin = resolvePlugin(plugins, parseIntentPlugin);

          parent.actionsMap['create-object-group']?.addAction({
            id: `${MAP_PLUGIN}/create`,
            label: ['create object label', { ns: MAP_PLUGIN }],
            icon: (props) => <Compass {...props} />,
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
      surface: {
        component: (data, role) => {
          switch (role) {
            case 'main': {
              return isObject(data.active) ? <MapMain map={data.active} /> : null;
            }
          }

          return null;
        },
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

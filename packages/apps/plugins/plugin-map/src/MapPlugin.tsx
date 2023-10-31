//
// Copyright 2023 DXOS.org
//

import { Compass, type IconProps } from '@phosphor-icons/react';
import React from 'react';

import { SpaceAction } from '@braneframe/plugin-space';
import { Folder } from '@braneframe/types';
import { resolvePlugin, type PluginDefinition, parseIntentPlugin, LayoutAction } from '@dxos/app-framework';
import { Expando } from '@dxos/react-client/echo';

import { MapMain } from './components';
import translations from './translations';
import { MAP_PLUGIN, MapAction, type MapPluginProvides, isObject } from './types';

// TODO(wittjosiah): This ensures that typed objects are not proxied by deepsignal. Remove.
// https://github.com/luisherranz/deepsignal/issues/36
(globalThis as any)[Expando.name] = Expando;

export const MapPlugin = (): PluginDefinition<MapPluginProvides> => {
  return {
    meta: {
      id: MAP_PLUGIN,
    },
    provides: {
      metadata: {
        records: {
          map: {
            fallbackName: ['object title placeholder', { ns: MAP_PLUGIN }],
            icon: (props: IconProps) => <Compass {...props} />,
          },
        },
      },
      translations,
      graph: {
        builder: ({ parent, plugins }) => {
          if (!(parent.data instanceof Folder)) {
            return;
          }

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
                  action: SpaceAction.ADD_TO_FOLDER,
                  data: { spaceKey: parent.data },
                },
                {
                  action: LayoutAction.ACTIVATE,
                },
              ]),
            properties: {
              testId: 'mapPlugin.createObject',
            },
          });
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

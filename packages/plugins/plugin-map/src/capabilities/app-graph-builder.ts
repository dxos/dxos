//
// Copyright 2025 DXOS.org
//

import { Capabilities, contributes, createIntent, type PluginsContext } from '@dxos/app-framework';
import { createExtension, type Node } from '@dxos/plugin-graph';

import { MAP_PLUGIN } from '../meta';
import { MapType, MapAction } from '../types';

export default (context: PluginsContext) =>
  contributes(
    Capabilities.AppGraphBuilder,
    createExtension({
      id: MapAction.Toggle._tag,
      filter: (node): node is Node<MapType> => node.data instanceof MapType,
      actions: () => {
        return [
          {
            id: `${MAP_PLUGIN}/toggle`,
            data: async () => {
              const { dispatchPromise: dispatch } = context.requestCapability(Capabilities.IntentDispatcher);
              await dispatch(createIntent(MapAction.Toggle));
            },
            properties: {
              label: ['toggle type label', { ns: MAP_PLUGIN }],
              icon: 'ph--compass--regular',
            },
          },
        ];
      },
    }),
  );

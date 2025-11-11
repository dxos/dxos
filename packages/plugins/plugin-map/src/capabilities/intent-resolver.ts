//
// Copyright 2025 DXOS.org
//

import { Capabilities, type PluginContext, contributes, createResolver } from '@dxos/app-framework';
import { ClientCapabilities } from '@dxos/plugin-client';

import { Map, MapAction } from '../types';

import { MapCapabilities } from './capabilities';

export default (context: PluginContext) =>
  contributes(Capabilities.IntentResolver, [
    createResolver({
      intent: MapAction.Create,
      resolve: async ({ space, name, typename, locationFieldName, center, zoom, coordinates }) => {
        const client = context.getCapability(ClientCapabilities.Client);
        const map = await Map.make({
          client,
          space,
          name,
          typename,
          pivotFieldName: locationFieldName,
          center,
          zoom,
          coordinates,
        });
        return { data: { object: map } };
      },
    }),
    createResolver({
      intent: MapAction.Toggle,
      resolve: () => {
        const state = context.getCapability(MapCapabilities.MutableState);
        state.type = state.type === 'globe' ? 'map' : 'globe';
      },
    }),
  ]);

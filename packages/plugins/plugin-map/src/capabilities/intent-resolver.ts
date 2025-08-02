//
// Copyright 2025 DXOS.org
//

import { contributes, Capabilities, createResolver, type PluginContext } from '@dxos/app-framework';
import { ClientCapabilities } from '@dxos/plugin-client';

import { Map, MapAction } from '../types';

import { MapCapabilities } from './capabilities';

export default (context: PluginContext) =>
  contributes(Capabilities.IntentResolver, [
    createResolver({
      intent: MapAction.Create,
      resolve: async ({ space, name, typename, locationFieldId }) => {
        const client = context.getCapability(ClientCapabilities.Client);
        const { view } = await Map.createMapView({ client, space, name, typename, locationFieldId });
        return { data: { object: view } };
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

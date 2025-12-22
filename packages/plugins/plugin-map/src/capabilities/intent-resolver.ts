//
// Copyright 2025 DXOS.org
//

import { Capabilities, type PluginContext, contributes, createResolver, defineCapabilityModule } from '@dxos/app-framework';
import { View } from '@dxos/schema';

import { Map, MapAction } from '../types';

import { MapCapabilities } from './capabilities';

export default defineCapabilityModule((context: PluginContext) =>
  contributes(Capabilities.IntentResolver, [
    createResolver({
      intent: MapAction.Create,
      resolve: async ({ db, name, typename, locationFieldName, center, zoom, coordinates }) => {
        const { view } = await View.makeFromDatabase({ db, typename, pivotFieldName: locationFieldName });
        const map = Map.make({ name, center, zoom, coordinates, view });
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
  ]));

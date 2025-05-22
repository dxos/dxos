//
// Copyright 2025 DXOS.org
//

import { contributes, Capabilities, createResolver, type PluginContext } from '@dxos/app-framework';

import { MapCapabilities } from './capabilities';
import { MapAction } from '../types';
import { initializeMap } from '../util';

export default (context: PluginContext) =>
  contributes(Capabilities.IntentResolver, [
    createResolver({
      intent: MapAction.Create,
      resolve: async ({ space, name, coordinates, initialSchema, locationProperty }) => {
        const { map } = await initializeMap({
          space,
          name,
          coordinates,
          initialSchema,
          locationProperty,
        });
        return {
          data: { object: map },
        };
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

//
// Copyright 2025 DXOS.org
//

import { contributes, Capabilities, createResolver, type PluginsContext } from '@dxos/app-framework';
import { create } from '@dxos/live-object';

import { MapCapabilities } from './capabilities';
import { MapAction, MapType } from '../types';

export default (context: PluginsContext) =>
  contributes(Capabilities.IntentResolver, [
    createResolver({
      intent: MapAction.Create,
      resolve: ({ name }) => ({
        data: { object: create(MapType, { name }) },
      }),
    }),
    createResolver({
      intent: MapAction.Toggle,
      resolve: () => {
        const state = context.requestCapability(MapCapabilities.MutableState);
        state.type = state.type === 'globe' ? 'map' : 'globe';
      },
    }),
  ]);

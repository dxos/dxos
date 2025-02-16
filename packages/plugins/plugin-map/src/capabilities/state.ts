//
// Copyright 2025 DXOS.org
//

import { contributes } from '@dxos/app-framework';
import { LocalStorageStore } from '@dxos/local-storage';
import { type LatLngLiteral } from '@dxos/react-ui-geo';

import { MapCapabilities } from './capabilities';
import { type MapControlType } from '../components';
import { MAP_PLUGIN } from '../meta';

export default () => {
  const state = new LocalStorageStore<MapCapabilities.State>(MAP_PLUGIN, {
    type: 'map',
  });

  state
    .prop({ key: 'type', type: LocalStorageStore.enum<MapControlType>() })
    .prop({ key: 'zoom', type: LocalStorageStore.number({ allowUndefined: true }) })
    .prop({ key: 'center', type: LocalStorageStore.json<LatLngLiteral | undefined>() });

  return contributes(MapCapabilities.State, state.values);
};

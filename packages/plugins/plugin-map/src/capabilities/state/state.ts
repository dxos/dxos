//
// Copyright 2025 DXOS.org
//

import * as Effect from 'effect/Effect';

import { Capability } from '@dxos/app-framework';

import { LocalStorageStore } from '@dxos/local-storage';

import { type LatLngLiteral } from '@dxos/react-ui-geo';


import { type MapControlType } from '../../components';

import { meta } from '../../meta';

import { MapCapabilities } from '../../types';

export default Capability.makeModule(() =>
  Effect.sync(() => {
  const state = new LocalStorageStore<MapCapabilities.State>(meta.id, {
    type: 'map',
  });

  state
    .prop({ key: 'type', type: LocalStorageStore.enum<MapControlType>() })
    .prop({ key: 'zoom', type: LocalStorageStore.number({ allowUndefined: true }) })
    .prop({ key: 'center', type: LocalStorageStore.json<LatLngLiteral | undefined>() });

  return Capability.contributes(MapCapabilities.State, state.values);
  }),
);

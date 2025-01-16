//
// Copyright 2025 DXOS.org
//

import { type LatLngLiteral } from 'leaflet';

import { defineCapability } from '@dxos/app-framework';
import { type DeepReadonly } from '@dxos/util';

import { type MapControlType } from '../components';
import { MAP_PLUGIN } from '../meta';

export namespace MapCapabilities {
  export type State = {
    type: MapControlType;
    center?: LatLngLiteral;
    zoom?: number;
  };
  export const State = defineCapability<DeepReadonly<State>>(`${MAP_PLUGIN}/capability/state`);
  export const MutableState = defineCapability<State>(`${MAP_PLUGIN}/capability/state`);
}

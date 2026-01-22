//
// Copyright 2025 DXOS.org
//

import { Capability } from '@dxos/app-framework';
import { type LatLngLiteral } from '@dxos/react-ui-geo';
import { type DeepReadonly } from '@dxos/util';

import { type MapControlType } from '../components';
import { meta } from '../meta';

export namespace MapCapabilities {
  export type State = {
    type: MapControlType;
    center?: LatLngLiteral;
    zoom?: number;
  };
  export const State = Capability.make<DeepReadonly<State>>(`${meta.id}/capability/state`);
  export const MutableState = Capability.make<State>(`${meta.id}/capability/state`);
}

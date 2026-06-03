//
// Copyright 2026 DXOS.org
//

import { Capability } from '@dxos/app-framework';
import { TripCapabilities } from '@dxos/plugin-trip';

export const Osrm: Capability.LazyCapability<
  void,
  Capability.Capability<typeof TripCapabilities.RoutingService>
> = Capability.lazy('Osrm', () => import('./osrm'));

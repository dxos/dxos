//
// Copyright 2026 DXOS.org
//

import { Capability } from '@dxos/app-framework';
import { TripCapabilities } from '@dxos/plugin-trip/types';

export const RoutingService: Capability.LazyCapability<
  void,
  Capability.Capability<typeof TripCapabilities.RoutingService>
> = Capability.lazy('RoutingService', () => import('./routing-service'));

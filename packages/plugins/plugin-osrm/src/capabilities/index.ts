//
// Copyright 2026 DXOS.org
//

import * as Capability from '@dxos/app-framework/Capability';
import { TripCapabilities } from '@dxos/plugin-trip/types';

import { OsrmEvents } from '../events';

export const RoutingService = Capability.lazyModule(
  'RoutingService',
  { provides: [TripCapabilities.RoutingService], activatesOn: OsrmEvents.Start },
  () => import('./routing-service'),
);

//
// Copyright 2026 DXOS.org
//

import * as ActivationEvents from '@dxos/app-framework/ActivationEvents';
import * as Capability from '@dxos/app-framework/Capability';
import { TripCapabilities } from '@dxos/plugin-trip/types';

export const RoutingService = Capability.lazyModule(
  'RoutingService',
  { provides: [TripCapabilities.RoutingService], activatesOn: ActivationEvents.DeferredStartup },
  () => import('./routing-service'),
);

//
// Copyright 2026 DXOS.org
//

import * as Capabilities from '@dxos/app-framework/Capabilities';
import * as AppCapability from '@dxos/app-toolkit/AppCapability';
import { TripCapabilities, TripEvents } from '@dxos/plugin-trip/types';

import { DuffelCapabilities } from '#types';

export const Duffel = AppCapability.settings(() => import('./duffel'), {
  requires: [Capabilities.AtomRegistry],
  provides: [DuffelCapabilities.Settings, TripCapabilities.BookingService],
  activatesOn: TripEvents.Start,
});

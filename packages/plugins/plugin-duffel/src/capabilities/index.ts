//
// Copyright 2026 DXOS.org
//

import { Capabilities } from '@dxos/app-framework';
import { AppCapability } from '@dxos/app-toolkit';
import { TripCapabilities } from '@dxos/plugin-trip/types';

import { DuffelCapabilities } from '#types';

export const Duffel = AppCapability.settings(() => import('./duffel'), {
  requires: [Capabilities.AtomRegistry],
  provides: [DuffelCapabilities.Settings, TripCapabilities.BookingService],
});

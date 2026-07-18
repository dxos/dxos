//
// Copyright 2026 DXOS.org
//

import { Capabilities, Capability } from '@dxos/app-framework';
import { AppCapabilities } from '@dxos/app-toolkit';
// Explicit import so the emitted `.d.ts` references the package via its public
// alias instead of a relative `node_modules` path (TS2883).
// eslint-disable-next-line unused-imports/no-unused-imports
import { type BookingSearch, TripCapabilities } from '@dxos/plugin-trip/types';

import { DuffelCapabilities } from '#types';

export const Duffel = Capability.lazyModule(
  'Duffel',
  {
    requires: [Capabilities.AtomRegistry],
    provides: [DuffelCapabilities.Settings, AppCapabilities.Settings, TripCapabilities.BookingService],
  },
  () => import('./duffel'),
);

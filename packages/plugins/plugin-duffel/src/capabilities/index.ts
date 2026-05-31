//
// Copyright 2026 DXOS.org
//

import { Capability } from '@dxos/app-framework';
import { AppCapabilities } from '@dxos/app-toolkit';
import { TripCapabilities } from '@dxos/plugin-trip';

import { DuffelCapabilities } from '#types';

// The explicit return tuple keeps the emitted declaration portable: the inferred
// type would otherwise reference `BookingSearch.BookingService` via a deep
// node_modules path that TypeScript cannot name (TS2883).
export const Duffel: Capability.LazyCapability<
  void,
  [
    Capability.Capability<typeof DuffelCapabilities.Settings>,
    Capability.Capability<typeof AppCapabilities.Settings>,
    Capability.Capability<typeof TripCapabilities.BookingService>,
  ]
> = Capability.lazy('Duffel', () => import('./duffel'));

//
// Copyright 2026 DXOS.org
//

import * as Capabilities from '@dxos/app-framework/Capabilities';
import * as AppCapability from '@dxos/app-toolkit/AppCapability';
import * as TripCapabilities from '@dxos/plugin-trip/TripCapabilities';
import * as TripEvents from '@dxos/plugin-trip/TripEvents';

import { translations } from '#translations';
import { DuffelCapabilities } from '#types';

export const Duffel = AppCapability.settings(() => import('./duffel'), {
  requires: [Capabilities.AtomRegistry],
  provides: [DuffelCapabilities.Settings, TripCapabilities.BookingService],
  activatesOn: TripEvents.Start,
});
export const Translations = AppCapability.translations(translations);

//
// Copyright 2026 DXOS.org
//

import * as Effect from 'effect/Effect';

import * as Capabilities from '@dxos/app-framework/Capabilities';
import * as Capability from '@dxos/app-framework/Capability';
import * as AppCapabilities from '@dxos/app-toolkit/AppCapabilities';
import * as AppCapability from '@dxos/app-toolkit/AppCapability';
import { createKvsStore } from '@dxos/effect';
import type * as BookingSearch from '@dxos/plugin-trip/BookingSearch';
import * as TripCapabilities from '@dxos/plugin-trip/TripCapabilities';
import * as TripEvents from '@dxos/plugin-trip/TripEvents';

import { meta } from '#meta';
import { makeDuffelBookingService } from '#services';
import { DuffelCapabilities, Settings } from '#types';

export const Duffel = AppCapability.settings(
  Effect.fnUntraced(function* () {
    const registry = yield* Capabilities.AtomRegistry;
    const settingsAtom = createKvsStore({
      key: meta.profile.key,
      schema: Settings.Settings,
      defaultValue: () => ({ apiKey: undefined }),
    });

    const service: BookingSearch.BookingService = makeDuffelBookingService(() => registry.get(settingsAtom).apiKey);

    return [
      Capability.contribute(DuffelCapabilities.Settings, settingsAtom),
      Capability.contribute(AppCapabilities.Settings, {
        prefix: meta.profile.key,
        schema: Settings.Settings,
        atom: settingsAtom,
      }),
      Capability.contribute(TripCapabilities.BookingService, service),
    ];
  }),
  {
    requires: [Capabilities.AtomRegistry],
    provides: [DuffelCapabilities.Settings, TripCapabilities.BookingService],
    activatesOn: TripEvents.Start,
  },
);

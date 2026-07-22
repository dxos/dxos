//
// Copyright 2026 DXOS.org
//

import * as Effect from 'effect/Effect';

import { Capabilities, Capability } from '@dxos/app-framework';
import { AppCapabilities } from '@dxos/app-toolkit';
import { createKvsStore } from '@dxos/effect';
import { type BookingSearch, TripCapabilities } from '@dxos/plugin-trip/types';

import { meta } from '#meta';
import { makeDuffelBookingService } from '#services';
import { DuffelCapabilities, Settings } from '#types';

export default Capability.makeModule(
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
);

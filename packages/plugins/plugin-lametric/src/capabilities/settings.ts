//
// Copyright 2026 DXOS.org
//

import * as Effect from 'effect/Effect';

import * as Capability from '@dxos/app-framework/Capability';
import * as AppCapabilities from '@dxos/app-toolkit/AppCapabilities';
import { createKvsStore } from '@dxos/effect';

import { meta } from '#meta';
import { LaMetricCapabilities, Settings } from '#types';

/** The device is not built for rapid updates, so changes inside this window are coalesced. */
const DEFAULT_MIN_PUSH_INTERVAL_MS = 5_000;

export default Capability.makeModule(() =>
  Effect.sync(() => {
    const settingsAtom = createKvsStore({
      key: meta.profile.key,
      schema: Settings.Settings,
      defaultValue: () => ({ minPushIntervalMs: DEFAULT_MIN_PUSH_INTERVAL_MS }),
    });

    return [
      Capability.contribute(LaMetricCapabilities.SettingsAtom, settingsAtom),
      Capability.contribute(AppCapabilities.Settings, {
        prefix: meta.profile.key,
        schema: Settings.Settings,
        atom: settingsAtom,
      }),
    ];
  }),
);

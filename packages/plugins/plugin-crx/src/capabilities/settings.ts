//
// Copyright 2026 DXOS.org
//

import * as Effect from 'effect/Effect';

import { Capability } from '@dxos/app-framework';
import { AppCapabilities } from '@dxos/app-toolkit';
import { createKvsStore } from '@dxos/effect';

import { meta } from '#meta';
import { CrxCapabilities, Settings } from '#types';

/**
 * Contributes the Settings atom both under the plugin-scoped capability (so
 * other plugins can read it) and under `AppCapabilities.Settings` (so the
 * standard settings panel surfaces it).
 */
export default Capability.makeModule(() =>
  Effect.sync(() => {
    const settingsAtom = createKvsStore({
      key: meta.id,
      schema: Settings.Settings,
      defaultValue: () => Settings.defaults,
    });

    return [
      Capability.contributes(CrxCapabilities.Settings, settingsAtom),
      Capability.contributes(AppCapabilities.Settings, {
        prefix: meta.id,
        schema: Settings.Settings,
        atom: settingsAtom,
      }),
    ];
  }),
);

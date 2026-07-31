//
// Copyright 2026 DXOS.org
//

import * as Effect from 'effect/Effect';

import { Capability } from '@dxos/app-framework';
import { AppCapabilities } from '@dxos/app-toolkit';
import { createKvsStore } from '@dxos/effect';

import { meta } from '#meta';
import { MapCapabilities } from '#types';

import { Settings } from '../types/Settings';

/**
 * Registers the plugin Settings (surfaced as a form via `AppCapabilities.Settings`) and exposes the
 * settings atom as `MapCapabilities.Settings` so containers (e.g. `MapArticle`) can read configured
 * API keys to select tile providers.
 */
export default Capability.makeModule(() =>
  Effect.sync(() => {
    const settingsAtom = createKvsStore({
      key: meta.profile.key,
      schema: Settings,
      defaultValue: (): Settings => ({}),
    });

    return [
      Capability.contribute(AppCapabilities.Settings, {
        prefix: meta.profile.key,
        schema: Settings,
        atom: settingsAtom,
      }),
      Capability.contribute(MapCapabilities.Settings, settingsAtom),
    ];
  }),
);

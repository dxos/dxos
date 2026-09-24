//
// Copyright 2026 DXOS.org
//

import * as Effect from 'effect/Effect';

import * as ActivationEvents from '@dxos/app-framework/ActivationEvents';
import * as Capability from '@dxos/app-framework/Capability';
import * as AppCapabilities from '@dxos/app-toolkit/AppCapabilities';
import * as AppCapability from '@dxos/app-toolkit/AppCapability';
import { createKvsStore } from '@dxos/effect';

import { meta } from '#meta';
import { MapCapabilities } from '#types';

import { Settings } from '../types/Settings.ts';

/**
 * Registers the plugin Settings (surfaced as a form via `AppCapabilities.Settings`) and exposes the
 * settings atom as `MapCapabilities.Settings` so containers (e.g. `MapArticle`) can read configured
 * API keys to select tile providers.
 */
export const MapSettings = AppCapability.settings(
  () =>
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
  {
    activatesOn: ActivationEvents.Idle,
    provides: [MapCapabilities.Settings],
  },
);

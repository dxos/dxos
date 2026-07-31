//
// Copyright 2026 DXOS.org
//

import * as Effect from 'effect/Effect';

import { Capability } from '@dxos/app-framework';
import { AppCapabilities } from '@dxos/app-toolkit';
import { createKvsStore } from '@dxos/effect';

import { meta } from '#meta';
import { BrainCapabilities, BrainSettings } from '#types';

/**
 * Shared KVS-backed atom for the fact-analysis settings (model/provider/strict). Created at module
 * scope so the analyze mailbox action (`./mailbox-action`) can read it live via the atom registry
 * without a cross-capability lookup or activation ordering.
 */
export const settingsAtom = createKvsStore({
  key: meta.profile.key,
  schema: BrainSettings.Settings,
  defaultValue: (): BrainSettings.Settings => ({}),
});

/** Owns the fact-analysis settings and registers them in the settings UI. */
export default Capability.makeModule(() =>
  Effect.succeed([
    Capability.contribute(BrainCapabilities.Settings, settingsAtom),
    Capability.contribute(AppCapabilities.Settings, {
      prefix: meta.profile.key,
      schema: BrainSettings.Settings,
      atom: settingsAtom,
    }),
  ]),
);

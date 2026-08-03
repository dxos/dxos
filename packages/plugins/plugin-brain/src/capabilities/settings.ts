//
// Copyright 2026 DXOS.org
//

import * as Effect from 'effect/Effect';

import * as Capability from '@dxos/app-framework/Capability';
import * as AppCapabilities from '@dxos/app-toolkit/AppCapabilities';
import { createKvsStore } from '@dxos/effect';

import { meta } from '#meta';

import * as BrainCapabilities from '../types/BrainCapabilities';
import * as BrainSettings from '../types/BrainSettings';

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

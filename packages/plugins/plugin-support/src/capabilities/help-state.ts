//
// Copyright 2025 DXOS.org
//

import * as Effect from 'effect/Effect';

import * as Capabilities from '@dxos/app-framework/Capabilities';
import * as Capability from '@dxos/app-framework/Capability';
import * as AppCapabilities from '@dxos/app-toolkit/AppCapabilities';
import { createKvsStore } from '@dxos/effect';

import { meta } from '#meta';
import { HelpCapabilities } from '#types';

export default Capability.makeModule(
  Effect.fnUntraced(function* () {
    const registry = yield* Capabilities.AtomRegistry;
    const stateAtom = createKvsStore({
      key: `${meta.profile.key}.state`,
      schema: HelpCapabilities.StateSchema,
      defaultValue: (): HelpCapabilities.State => ({
        running: false,
        showHints: true,
        showWelcome: true,
      }),
    });

    // Synced as its own namespace; the settings UI lists only prefixes equal to a plugin id.
    const toursPrefix = `${meta.profile.key}.tours`;
    const seenToursAtom = createKvsStore({
      key: toursPrefix,
      schema: HelpCapabilities.SeenToursSchema,
      defaultValue: (): HelpCapabilities.SeenTours => ({}),
    });

    // Merges the legacy record before any consumer can write help state.
    const seen = registry.get(seenToursAtom);
    const legacy = (registry.get(stateAtom).seenTours ?? []).filter((id) => !seen[id]);
    if (legacy.length > 0) {
      registry.set(seenToursAtom, { ...seen, ...Object.fromEntries(legacy.map((id) => [id, true])) });
    }

    return [
      Capability.contribute(HelpCapabilities.State, stateAtom),
      Capability.contribute(HelpCapabilities.SeenTours, seenToursAtom),
      Capability.contribute(AppCapabilities.Settings, {
        prefix: toursPrefix,
        schema: HelpCapabilities.SeenToursSchema,
        atom: seenToursAtom,
      }),
    ];
  }),
);

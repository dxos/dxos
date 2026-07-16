//
// Copyright 2025 DXOS.org
//

import * as Effect from 'effect/Effect';

import { Capability } from '@dxos/app-framework';
import { AppCapabilities } from '@dxos/app-toolkit';
import { createKvsStore } from '@dxos/effect';

import { meta } from '#meta';
import { DeckCapabilities, Settings } from '#types';

export default Capability.makeModule(() =>
  Effect.sync(() => {
    const settingsAtom = createKvsStore({
      key: meta.profile.key,
      schema: Settings.Settings,
      defaultValue: () => ({
        showHints: false,
        enableDeck: false,
        enableNativeRedirect: false,
        encapsulatedPlanks: false,
      }),
    });

    return [
      Capability.provide(DeckCapabilities.Settings, settingsAtom),
      Capability.provide(AppCapabilities.Settings, {
        prefix: meta.profile.key,
        schema: Settings.Settings,
        atom: settingsAtom,
      }),
    ];
  }),
);

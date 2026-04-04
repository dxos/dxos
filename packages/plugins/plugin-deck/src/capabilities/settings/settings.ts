//
// Copyright 2025 DXOS.org
//

import * as Effect from 'effect/Effect';

import { Capability } from '@dxos/app-framework';
import { AppCapabilities } from '@dxos/app-toolkit';
import { createKvsStore } from '@dxos/effect';

import { meta } from '../../meta';
import { DeckCapabilities, Settings } from '../../types';

export default Capability.makeModule(() =>
  Effect.sync(() => {
    const settingsAtom = createKvsStore({
      key: meta.id,
      schema: Settings.Settings,
      defaultValue: () => ({
        showHints: false,
        enableDeck: false,
        enableStatusbar: false,
        enableNativeRedirect: false,
        newPlankPositioning: 'start' as const,
        overscroll: 'none' as const,
        encapsulatedPlanks: false,
      }),
    });

    return [
      Capability.contributes(DeckCapabilities.Settings, settingsAtom),
      Capability.contributes(AppCapabilities.Settings, {
        prefix: meta.id,
        schema: Settings.Settings,
        atom: settingsAtom,
      }),
    ];
  }),
);

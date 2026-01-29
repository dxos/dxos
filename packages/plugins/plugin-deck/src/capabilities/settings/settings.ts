//
// Copyright 2025 DXOS.org
//

import * as Effect from 'effect/Effect';

import { Capability, Common } from '@dxos/app-framework';
import { createKvsStore } from '@dxos/effect';

import { meta } from '../../meta';
import { DeckCapabilities, DeckSettingsSchema } from '../../types';

export default Capability.makeModule(() =>
  Effect.sync(() => {
    const settingsAtom = createKvsStore({
      key: meta.id,
      schema: DeckSettingsSchema,
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
      Capability.contributes(Common.Capability.Settings, {
        prefix: meta.id,
        schema: DeckSettingsSchema,
        atom: settingsAtom,
      }),
    ];
  }),
);

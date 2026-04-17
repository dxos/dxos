//
// Copyright 2026 DXOS.org
//

import * as Effect from 'effect/Effect';

import { Capability } from '@dxos/app-framework';
import { AppCapabilities } from '@dxos/app-toolkit';
import { createKvsStore } from '@dxos/effect';

import { meta } from '#meta';
import { SlackCapabilities } from '#types';

export default Capability.makeModule(() =>
  Effect.sync(() => {
    const settingsAtom = createKvsStore({
      key: meta.id,
      schema: SlackCapabilities.SettingsSchema,
      defaultValue: () => ({
        respondToMentions: true,
        respondToDMs: true,
      }),
    });

    return [
      Capability.contributes(SlackCapabilities.Settings, settingsAtom),
      Capability.contributes(AppCapabilities.Settings, {
        prefix: meta.id,
        schema: SlackCapabilities.SettingsSchema,
        atom: settingsAtom,
      }),
    ];
  }),
);

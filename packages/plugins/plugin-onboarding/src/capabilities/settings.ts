//
// Copyright 2026 DXOS.org
//

import * as Effect from 'effect/Effect';
import * as Schema from 'effect/Schema';

import { Capability } from '@dxos/app-framework';
import { AppCapabilities } from '@dxos/app-toolkit';
import { createKvsStore } from '@dxos/effect';

import { meta } from '../meta';

// Empty schema — this plugin has no persisted settings. The contribution is
// required so the settings plugin creates a nav node for this plugin's settings page.
const Settings = Schema.Struct({});

export default Capability.makeModule(() =>
  Effect.sync(() => {
    const settingsAtom = createKvsStore({
      key: meta.profile.key,
      schema: Settings,
      defaultValue: () => ({}),
    });

    return [
      Capability.provide(AppCapabilities.Settings, {
        prefix: meta.profile.key,
        schema: Settings,
        atom: settingsAtom,
      }),
    ];
  }),
);

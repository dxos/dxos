//
// Copyright 2025 DXOS.org
//

import * as Effect from 'effect/Effect';

import { Capability } from '@dxos/app-framework';
import { AppCapabilities } from '@dxos/app-toolkit';
import { createKvsStore } from '@dxos/effect';

import { meta } from '#meta';
import { Settings, CommentCapabilities } from '#types';

export default Capability.makeModule(() =>
  Effect.sync(() => {
    const settingsAtom = createKvsStore({
      key: meta.id,
      schema: Settings.Settings,
      defaultValue: () => ({}),
    });

    return [
      // Expose atom directly for programmatic access.
      Capability.contributes(CommentCapabilities.Settings, settingsAtom),
      // Contribute to common settings for UI discovery.
      Capability.contributes(AppCapabilities.Settings, {
        prefix: meta.id,
        schema: Settings.Settings,
        atom: settingsAtom,
      }),
    ];
  }),
);

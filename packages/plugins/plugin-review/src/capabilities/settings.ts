//
// Copyright 2025 DXOS.org
//

import * as Effect from 'effect/Effect';

import { Capability } from '@dxos/app-framework';
import { AppCapabilities } from '@dxos/app-toolkit';
import { createKvsStore } from '@dxos/effect';

import { meta } from '#meta';
import { CommentCapabilities, Settings } from '#types';

export default Capability.makeModule(() =>
  Effect.sync(() => {
    const settingsAtom = createKvsStore({
      key: meta.profile.key,
      schema: Settings.Settings,
      defaultValue: () => ({}),
    });

    return [
      // Review operations read settings without resolving the app settings registry.
      Capability.contributes(CommentCapabilities.Settings, settingsAtom),
      // Registers the schema so the generic settings UI can discover and render it.
      Capability.contributes(AppCapabilities.Settings, {
        prefix: meta.profile.key,
        schema: Settings.Settings,
        atom: settingsAtom,
      }),
    ];
  }),
);

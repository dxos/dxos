//
// Copyright 2025 DXOS.org
//

import * as Effect from 'effect/Effect';

import { Capability } from '@dxos/app-framework';
import { AppCapabilities } from '@dxos/app-toolkit';
import { createKvsStore } from '@dxos/effect';

import { meta } from '../../meta';
import { ThreadSettingsSchema } from '../../types';
import { ThreadCapabilities } from '../../types/capabilities';

export default Capability.makeModule(() =>
  Effect.sync(() => {
    const settingsAtom = createKvsStore({
      key: meta.id,
      schema: ThreadSettingsSchema,
      defaultValue: () => ({}),
    });

    return [
      // Expose atom directly for programmatic access.
      Capability.contributes(ThreadCapabilities.Settings, settingsAtom),
      // Contribute to common settings for UI discovery.
      Capability.contributes(AppCapabilities.Settings, {
        prefix: meta.id,
        schema: ThreadSettingsSchema,
        atom: settingsAtom,
      }),
    ];
  }),
);

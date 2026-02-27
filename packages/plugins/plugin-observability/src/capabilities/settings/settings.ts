//
// Copyright 2025 DXOS.org
//

import * as Effect from 'effect/Effect';

import { Capability } from '@dxos/app-framework';
import { AppCapabilities } from '@dxos/app-toolkit';
import { createKvsStore } from '@dxos/effect';

import { ObservabilitySettingsSchema } from '../../containers';
import { meta } from '../../meta';
import { ObservabilityCapabilities } from '../../types';

export default Capability.makeModule(() =>
  Effect.sync(() => {
    const settingsAtom = createKvsStore({
      key: meta.id,
      schema: ObservabilitySettingsSchema,
      defaultValue: () => ({
        enabled: true,
      }),
    });

    return [
      Capability.contributes(ObservabilityCapabilities.Settings, settingsAtom),
      Capability.contributes(AppCapabilities.Settings, {
        prefix: meta.id,
        schema: ObservabilitySettingsSchema,
        atom: settingsAtom,
      }),
    ];
  }),
);

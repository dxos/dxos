//
// Copyright 2025 DXOS.org
//

import * as Effect from 'effect/Effect';

import { Capability, Common } from '@dxos/app-framework';
import { createKvsStore } from '@dxos/effect';

import { ObservabilitySettingsSchema } from '../../components';
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
      Capability.contributes(Common.Capability.Settings, {
        prefix: meta.id,
        schema: ObservabilitySettingsSchema,
        atom: settingsAtom,
      }),
    ];
  }),
);

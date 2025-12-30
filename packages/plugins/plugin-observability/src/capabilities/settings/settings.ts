//
// Copyright 2025 DXOS.org
//

import * as Effect from 'effect/Effect';

import { Capability, Common } from '@dxos/app-framework';
import { live } from '@dxos/live-object';

import { type ObservabilitySettingsProps, ObservabilitySettingsSchema } from '../../components';
import { meta } from '../../meta';

export default Capability.makeModule(() =>
  Effect.sync(() => {
    const settings = live<ObservabilitySettingsProps>({
      enabled: true,
    });

    return Capability.contributes(Common.Capability.Settings, {
      prefix: meta.id,
      schema: ObservabilitySettingsSchema,
      value: settings,
    });
  }),
);

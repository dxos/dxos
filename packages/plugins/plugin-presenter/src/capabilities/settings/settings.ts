//
// Copyright 2025 DXOS.org
//

import * as Effect from 'effect/Effect';

import { Capability, Common } from '@dxos/app-framework';
import { live } from '@dxos/live-object';

import { meta } from '../../meta';
import { type PresenterSettingsProps, PresenterSettingsSchema } from '../../types';

export default Capability.makeModule(() =>
  Effect.sync(() => {
    const settings = live<PresenterSettingsProps>({});

    return Capability.contributes(Common.Capability.Settings, {
      prefix: meta.id,
      schema: PresenterSettingsSchema,
      value: settings,
    });
  }),
);

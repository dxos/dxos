//
// Copyright 2025 DXOS.org
//

import * as Effect from 'effect/Effect';

import { Capability, Common } from '@dxos/app-framework';

import { live } from '@dxos/live-object';


import { meta } from '../../meta';

import { type ThreadSettingsProps, ThreadSettingsSchema } from '../../types';

export default Capability.makeModule(() =>
  Effect.sync(() => {
  const settings = live<ThreadSettingsProps>({});

  return Capability.contributes(Common.Capability.Settings, {
    prefix: meta.id,
    schema: ThreadSettingsSchema,
    value: settings,
  });
  }),
);

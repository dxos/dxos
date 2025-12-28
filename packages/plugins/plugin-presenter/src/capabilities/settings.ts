//
// Copyright 2025 DXOS.org
//

import { Capabilities, Capability } from '@dxos/app-framework';
import { live } from '@dxos/live-object';

import { meta } from '../meta';
import { type PresenterSettingsProps, PresenterSettingsSchema } from '../types';

export default Capability.makeModule(() => {
  const settings = live<PresenterSettingsProps>({});

  return Capability.contributes(Capabilities.Settings, {
    prefix: meta.id,
    schema: PresenterSettingsSchema,
    value: settings,
  });
});

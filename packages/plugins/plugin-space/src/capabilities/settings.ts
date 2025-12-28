//
// Copyright 2025 DXOS.org
//

import { Capabilities, Capability } from '@dxos/app-framework';
import { live } from '@dxos/live-object';

import { meta } from '../meta';
import { type SpaceSettingsProps, SpaceSettingsSchema } from '../types';

export default Capability.makeModule(() => {
  const settings = live<SpaceSettingsProps>({
    showHidden: false,
  });

  return Capability.contributes(Capabilities.Settings, {
    prefix: meta.id,
    schema: SpaceSettingsSchema,
    value: settings,
  });
});

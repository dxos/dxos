//
// Copyright 2025 DXOS.org
//

import { Capabilities, Capability } from '@dxos/app-framework';
import { live } from '@dxos/live-object';

import { meta } from '../meta';
import { type SketchSettingsProps, SketchSettingsSchema } from '../types';

export default Capability.makeModule(() => {
  const settings = live<SketchSettingsProps>({});

  return Capability.contributes(Capabilities.Settings, {
    prefix: meta.id,
    schema: SketchSettingsSchema,
    value: settings,
  });
});

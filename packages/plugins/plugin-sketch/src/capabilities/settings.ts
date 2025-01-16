//
// Copyright 2025 DXOS.org
//

import { Capabilities, contributes } from '@dxos/app-framework';
import { create } from '@dxos/live-object';

import { SKETCH_PLUGIN } from '../meta';
import { type SketchSettingsProps, SketchSettingsSchema } from '../types';

export default () => {
  const settings = create<SketchSettingsProps>({});
  return contributes(Capabilities.Settings, { schema: SketchSettingsSchema, prefix: SKETCH_PLUGIN, value: settings });
};

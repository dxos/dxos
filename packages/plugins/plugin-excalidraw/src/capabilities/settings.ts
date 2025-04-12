//
// Copyright 2025 DXOS.org
//

import { Capabilities, contributes } from '@dxos/app-framework';
import { create } from '@dxos/live-object';

import { EXCALIDRAW_PLUGIN } from '../meta';
import { type SketchSettingsProps, SketchSettingsSchema } from '../types';

export default () => {
  const settings = create<SketchSettingsProps>({});
  return contributes(Capabilities.Settings, {
    schema: SketchSettingsSchema,
    prefix: EXCALIDRAW_PLUGIN,
    value: settings,
  });
};

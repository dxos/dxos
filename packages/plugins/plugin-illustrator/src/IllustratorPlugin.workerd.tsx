//
// Copyright 2026 DXOS.org
//

import * as Plugin from '@dxos/app-framework/Plugin';
import * as AppCapability from '@dxos/app-toolkit/AppCapability';

import { meta } from '#meta';

import * as Drawing from './types/Drawing';

export const IllustratorPlugin = Plugin.define(meta).pipe(
  Plugin.addModule(AppCapability.schema([Drawing.Drawing, Drawing.Canvas])),
  Plugin.make,
);

export default IllustratorPlugin;

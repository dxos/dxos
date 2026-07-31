//
// Copyright 2026 DXOS.org
//

import { Plugin } from '@dxos/app-framework';
import * as AppCapability from '@dxos/app-toolkit/AppCapability';

import { meta } from '#meta';
import { Drawing } from '#types';

export const IllustratorPlugin = Plugin.define(meta).pipe(
  Plugin.addModule(AppCapability.schema([Drawing.Drawing])),
  Plugin.make,
);

export default IllustratorPlugin;

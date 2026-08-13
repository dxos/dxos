//
// Copyright 2026 DXOS.org
//

import * as Plugin from '@dxos/app-framework/Plugin';
import * as AppCapability from '@dxos/app-toolkit/AppCapability';

import { meta } from '#meta';

export const IllustratorPlugin = Plugin.define(meta).pipe(
  Plugin.addModule(AppCapability.schema(() => import('./schema'))),
  Plugin.make,
);

export default IllustratorPlugin;

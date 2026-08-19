//
// Copyright 2023 DXOS.org
//

import * as Plugin from '@dxos/app-framework/Plugin';
import * as AppCapability from '@dxos/app-toolkit/AppCapability';

import { meta } from '#meta';

import type { PreviewPluginOptions } from './types';

export const PreviewPlugin = Plugin.define<PreviewPluginOptions>(meta).pipe(
  Plugin.addModule(AppCapability.schema(() => import('./capabilities/schema'))),
  Plugin.make,
);

export default PreviewPlugin;

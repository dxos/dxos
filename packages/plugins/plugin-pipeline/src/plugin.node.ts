//
// Copyright 2023 DXOS.org
//

import * as Plugin from '@dxos/app-framework/Plugin';
import * as AppCapability from '@dxos/app-toolkit/AppCapability';

import { CreateObject } from '#capabilities';
import { meta } from '#meta';

export const PipelinePlugin = Plugin.define(meta).pipe(
  Plugin.addModule(CreateObject),
  Plugin.addModule(AppCapability.schema(() => import('./capabilities/schema'))),
  Plugin.make,
);

export default PipelinePlugin;

//
// Copyright 2023 DXOS.org
//

import * as Plugin from '@dxos/app-framework/Plugin';
import * as AppCapability from '@dxos/app-toolkit/AppCapability';
import { Pipeline } from '@dxos/types';

import { meta } from '#meta';

export const PipelinePlugin = Plugin.define(meta).pipe(
  Plugin.addModule(AppCapability.schema([Pipeline.Pipeline])),
  Plugin.make,
);

export default PipelinePlugin;

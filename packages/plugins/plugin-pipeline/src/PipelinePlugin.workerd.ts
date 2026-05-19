//
// Copyright 2023 DXOS.org
//

import { Plugin } from '@dxos/app-framework';
import { AppPlugin } from '@dxos/app-toolkit';
import { Pipeline } from '@dxos/types';

import { meta } from '#meta';

export const PipelinePlugin = Plugin.define(meta).pipe(
  AppPlugin.addSchemaModule({ schema: [Pipeline.Pipeline] }),
  Plugin.make,
);

export default PipelinePlugin;

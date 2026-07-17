//
// Copyright 2023 DXOS.org
//

import { Plugin } from '@dxos/app-framework';
import { AppPlugin } from '@dxos/app-toolkit';
import { Pipeline } from '@dxos/types';

import { CreateObject } from '#capabilities';
import { meta } from '#meta';

export const PipelinePlugin = Plugin.define(meta).pipe(
  AppPlugin.addCreateObjectModule({
    requires: CreateObject.requires,
    provides: CreateObject.provides,
    activate: CreateObject,
  }),
  AppPlugin.addSchemaModule({ schema: [Pipeline.Pipeline] }),
  Plugin.make,
);

export default PipelinePlugin;

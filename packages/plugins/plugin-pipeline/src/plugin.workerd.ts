//
// Copyright 2023 DXOS.org
//

import * as Plugin from '@dxos/app-framework/Plugin';

import { Schema } from '#capabilities';
import { meta } from '#meta';

export const PipelinePlugin = Plugin.define(meta).pipe(Plugin.addModule(Schema), Plugin.make);

export default PipelinePlugin;

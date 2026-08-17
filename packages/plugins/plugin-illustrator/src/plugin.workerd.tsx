//
// Copyright 2026 DXOS.org
//

import * as Plugin from '@dxos/app-framework/Plugin';

import { Schema } from '#capabilities';
import { meta } from '#meta';

export const IllustratorPlugin = Plugin.define(meta).pipe(Plugin.addModule(Schema), Plugin.make);

export default IllustratorPlugin;

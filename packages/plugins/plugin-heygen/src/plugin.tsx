//
// Copyright 2026 DXOS.org
//

import * as Plugin from '@dxos/app-framework/Plugin';

import { Connector, GenerationService } from '#capabilities';
import { meta } from '#meta';

export const HeyGenPlugin = Plugin.define(meta).pipe(
  Plugin.addModule(Connector),
  Plugin.addModule(GenerationService),
  Plugin.make,
);

export default HeyGenPlugin;

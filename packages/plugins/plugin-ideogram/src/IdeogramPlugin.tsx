//
// Copyright 2026 DXOS.org
//

import { Plugin } from '@dxos/app-framework';

import { Connector, GenerationService } from '#capabilities';
import { meta } from '#meta';

export const IdeogramPlugin = Plugin.define(meta).pipe(
  Plugin.addLazyModule(Connector),
  Plugin.addLazyModule(GenerationService),
  Plugin.make,
);

export default IdeogramPlugin;

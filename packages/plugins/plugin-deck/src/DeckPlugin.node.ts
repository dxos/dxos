//
// Copyright 2025 DXOS.org
//

import { Plugin } from '@dxos/app-framework';

import { AppGraphBuilder, OperationHandler } from '#capabilities';
import { meta } from '#meta';

export const DeckPlugin = Plugin.define(meta).pipe(
  Plugin.addLazyModule(AppGraphBuilder),
  Plugin.addLazyModule(OperationHandler),
  Plugin.make,
);

export default DeckPlugin;

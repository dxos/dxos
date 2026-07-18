//
// Copyright 2025 DXOS.org
//

import { Plugin } from '@dxos/app-framework';

import { Attention, Keyboard, OperationHandler, ReactContext } from '#capabilities';
import { meta } from '#meta';

export const AttentionPlugin = Plugin.define(meta).pipe(
  Plugin.addLazyModule(OperationHandler),
  Plugin.addLazyModule(Attention),
  Plugin.addLazyModule(ReactContext),
  Plugin.addLazyModule(Keyboard),
  Plugin.make,
);

export default AttentionPlugin;

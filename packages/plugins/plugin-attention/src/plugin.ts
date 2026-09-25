//
// Copyright 2025 DXOS.org
//

import * as Plugin from '@dxos/app-framework/Plugin';

import { Attention, Keyboard, OperationHandler, ReactContext } from '#capabilities';
import { meta } from '#meta';

export const AttentionPlugin = Plugin.define(meta).pipe(
  Plugin.addModule(Attention),
  Plugin.addModule(Keyboard),
  Plugin.addModule(OperationHandler),
  Plugin.addModule(ReactContext),
  Plugin.make,
);

export default AttentionPlugin;

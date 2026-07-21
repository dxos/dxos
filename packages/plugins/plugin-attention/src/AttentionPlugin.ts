//
// Copyright 2025 DXOS.org
//

import { Plugin } from '@dxos/app-framework';

import { Attention, Keyboard, OperationHandler, ReactContext } from '#capabilities';
import { meta } from '#meta';

export const AttentionPlugin = Plugin.define(meta).pipe(
  Plugin.addModule(OperationHandler),
  Plugin.addModule(Attention),
  Plugin.addModule(ReactContext),
  Plugin.addModule(Keyboard),
  Plugin.make,
);

export default AttentionPlugin;

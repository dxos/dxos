//
// Copyright 2026 DXOS.org
//

import * as Plugin from '@dxos/app-framework/Plugin';

import { OperationHandler, Schema } from '#capabilities';
import { meta } from '#meta';

export const ChessComPlugin = Plugin.define(meta).pipe(
  Plugin.addModule(OperationHandler),
  Plugin.addModule(Schema),
  Plugin.make,
);

export default ChessComPlugin;

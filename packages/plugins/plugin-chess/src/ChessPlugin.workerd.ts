//
// Copyright 2026 DXOS.org
//

import { Plugin } from '@dxos/app-framework';
import { AppPlugin } from '@dxos/app-toolkit';

import { OperationHandler } from '#capabilities';
import { meta } from '#meta';
import { Chess, ChessPositionIndex, PlayerReview } from '#types';

export const ChessPlugin = Plugin.define(meta).pipe(
  AppPlugin.addOperationHandlerModule({ activate: OperationHandler }),
  AppPlugin.addSchemaModule({ schema: [Chess.State, ChessPositionIndex.PositionIndex, PlayerReview.Review] }),
  Plugin.make,
);

export default ChessPlugin;

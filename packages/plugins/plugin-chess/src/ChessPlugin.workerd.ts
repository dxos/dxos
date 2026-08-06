//
// Copyright 2026 DXOS.org
//

import * as Plugin from '@dxos/app-framework/Plugin';
import * as AppCapability from '@dxos/app-toolkit/AppCapability';

import { OperationHandler } from '#capabilities';
import { meta } from '#meta';

import * as Chess from './types/Chess';
import * as ChessPositionIndex from './types/ChessPositionIndex';
import * as PlayerReview from './types/PlayerReview';

export const ChessPlugin = Plugin.define(meta).pipe(
  Plugin.addModule(OperationHandler),
  Plugin.addModule(AppCapability.schema([Chess.State, ChessPositionIndex.PositionIndex, PlayerReview.Review])),
  Plugin.make,
);

export default ChessPlugin;

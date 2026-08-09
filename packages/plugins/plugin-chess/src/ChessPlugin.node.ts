//
// Copyright 2026 DXOS.org
//

import * as Plugin from '@dxos/app-framework/Plugin';
import * as AppCapability from '@dxos/app-toolkit/AppCapability';

import { OperationHandler, SkillDefinition } from '#capabilities';
import { meta } from '#meta';

import * as Chess from './types/Chess';
import * as ChessPositionIndex from './types/ChessPositionIndex';
import * as PlayerReview from './types/PlayerReview';

/**
 * Headless variant of ChessPlugin (no React surfaces / GameVariant).
 * Used in node contexts (CLI, agents) where rendering is unavailable.
 */
export const ChessPlugin = Plugin.define(meta).pipe(
  Plugin.addModule(AppCapability.schema([Chess.State, ChessPositionIndex.PositionIndex, PlayerReview.Review])),
  Plugin.addModule(SkillDefinition),
  Plugin.addModule(OperationHandler),
  Plugin.make,
);

export default ChessPlugin;

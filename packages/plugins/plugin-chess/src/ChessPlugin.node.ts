//
// Copyright 2026 DXOS.org
//

import { Plugin } from '@dxos/app-framework';
import { AppCapability } from '@dxos/app-toolkit';

import { OperationHandler, SkillDefinition } from '#capabilities';
import { meta } from '#meta';
import { Chess, ChessPositionIndex, PlayerReview } from '#types';

/**
 * Headless variant of ChessPlugin (no React surfaces / GameVariant).
 * Used in node contexts (CLI, agents) where rendering is unavailable.
 */
export const ChessPlugin = Plugin.define(meta).pipe(
  Plugin.addLazyModule(AppCapability.schema([Chess.State, ChessPositionIndex.PositionIndex, PlayerReview.Review])),
  Plugin.addLazyModule(SkillDefinition),
  Plugin.addLazyModule(OperationHandler),
  Plugin.make,
);

export default ChessPlugin;

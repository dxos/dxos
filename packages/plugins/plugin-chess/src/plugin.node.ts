//
// Copyright 2026 DXOS.org
//

import * as Plugin from '@dxos/app-framework/Plugin';

import { OperationHandler, Schema, SkillDefinition } from '#capabilities';
import { meta } from '#meta';

/**
 * Headless variant of ChessPlugin (no React surfaces / GameVariant).
 * Used in node contexts (CLI, agents) where rendering is unavailable.
 */
export const ChessPlugin = Plugin.define(meta).pipe(
  Plugin.addModule(Schema),
  Plugin.addModule(SkillDefinition),
  Plugin.addModule(OperationHandler),
  Plugin.make,
);

export default ChessPlugin;

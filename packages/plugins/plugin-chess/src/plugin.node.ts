//
// Copyright 2026 DXOS.org
//

import * as Plugin from '@dxos/app-framework/Plugin';
import * as AppCapability from '@dxos/app-toolkit/AppCapability';

import { OperationHandler, SkillDefinition } from '#capabilities';
import { meta } from '#meta';

/**
 * Headless variant of ChessPlugin (no React surfaces / GameVariant).
 * Used in node contexts (CLI, agents) where rendering is unavailable.
 */
export const ChessPlugin = Plugin.define(meta).pipe(
  Plugin.addModule(AppCapability.schema(() => import('./schema'))),
  Plugin.addModule(SkillDefinition),
  Plugin.addModule(OperationHandler),
  Plugin.make,
);

export default ChessPlugin;

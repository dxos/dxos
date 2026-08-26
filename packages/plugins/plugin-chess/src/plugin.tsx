//
// Copyright 2023 DXOS.org
//

import * as Plugin from '@dxos/app-framework/Plugin';

import { GameVariant, OperationHandler, PluginAsset, Schema, SkillDefinition, Translations } from '#capabilities';
import { meta } from '#meta';

export const ChessPlugin = Plugin.define(meta).pipe(
  Plugin.addModule(GameVariant),
  Plugin.addModule(OperationHandler),
  Plugin.addModule(PluginAsset),
  Plugin.addModule(Schema),
  Plugin.addModule(SkillDefinition),
  Plugin.addModule(Translations),
  Plugin.make,
);

export default ChessPlugin;

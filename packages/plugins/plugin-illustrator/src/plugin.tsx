//
// Copyright 2026 DXOS.org
//

import * as Plugin from '@dxos/app-framework/Plugin';

import {
  CommentConfig,
  CreateObject,
  Migrations,
  OperationHandler,
  PluginAsset,
  ReactSurface,
  Schema,
  SkillDefinition,
  SvgVariant,
  Translations,
} from '#capabilities';
import { meta } from '#meta';

export const IllustratorPlugin = Plugin.define(meta).pipe(
  Plugin.addModule(CommentConfig),
  Plugin.addModule(CreateObject),
  Plugin.addModule(Migrations),
  Plugin.addModule(OperationHandler),
  Plugin.addModule(PluginAsset),
  Plugin.addModule(ReactSurface),
  Plugin.addModule(Schema),
  Plugin.addModule(SkillDefinition),
  Plugin.addModule(SvgVariant),
  Plugin.addModule(Translations),
  Plugin.make,
);

export default IllustratorPlugin;

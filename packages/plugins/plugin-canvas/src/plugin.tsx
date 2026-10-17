//
// Copyright 2026 DXOS.org
//

import * as Plugin from '@dxos/app-framework/Plugin';

import {
  AppGraphBuilder,
  CanvasSettings,
  DrawingVariant,
  OperationHandler,
  ReactSurface,
  Schema,
  SkillDefinition,
  SpaceTemplates,
  Translations,
} from '#capabilities';
import { meta } from '#meta';

export const CanvasPlugin = Plugin.define(meta).pipe(
  Plugin.addModule(AppGraphBuilder),
  Plugin.addModule(CanvasSettings),
  Plugin.addModule(DrawingVariant),
  Plugin.addModule(OperationHandler),
  Plugin.addModule(ReactSurface),
  Plugin.addModule(Schema),
  Plugin.addModule(SkillDefinition),
  Plugin.addModule(SpaceTemplates),
  Plugin.addModule(Translations),
  Plugin.make,
);

export default CanvasPlugin;

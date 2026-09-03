//
// Copyright 2026 DXOS.org
//

import * as Plugin from '@dxos/app-framework/Plugin';

import {
  AppGraphBuilder,
  DiagnosticProviders,
  OperationHandler,
  PluginAsset,
  ReactSurface,
  SkillDefinition,
  Translations,
} from '#capabilities';
import { meta } from '#meta';

export const DoctorPlugin = Plugin.define(meta).pipe(
  Plugin.addModule(AppGraphBuilder),
  Plugin.addModule(DiagnosticProviders),
  Plugin.addModule(OperationHandler),
  Plugin.addModule(PluginAsset),
  Plugin.addModule(ReactSurface),
  Plugin.addModule(SkillDefinition),
  Plugin.addModule(Translations),
  Plugin.make,
);

export default DoctorPlugin;

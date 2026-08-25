//
// Copyright 2026 DXOS.org
//

import * as Plugin from '@dxos/app-framework/Plugin';

import {
  AppGraphBuilder,
  CreateObject,
  OperationHandler,
  ReactSurface,
  Schema,
  SkillDefinition,
  SubjectContext,
  Templates,
  Translations,
} from '#capabilities';
import { meta } from '#meta';

export const ProjectsPlugin = Plugin.define(meta).pipe(
  Plugin.addModule(AppGraphBuilder),
  Plugin.addModule(CreateObject),
  Plugin.addModule(OperationHandler),
  Plugin.addModule(ReactSurface),
  Plugin.addModule(Schema),
  Plugin.addModule(SkillDefinition),
  Plugin.addModule(SubjectContext),
  Plugin.addModule(Templates),
  Plugin.addModule(Translations),
  Plugin.make,
);

export default ProjectsPlugin;

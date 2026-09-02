//
// Copyright 2026 DXOS.org
//

import * as Plugin from '@dxos/app-framework/Plugin';

import {
  AppGraphBuilder,
  CreateObject,
  OperationHandler,
  ReactSurface,
  SampleSpaces,
  Schema,
  SkillDefinition,
  SubjectContext,
  TaskAction,
  Templates,
  Translations,
} from '#capabilities';
import { meta } from '#meta';

export const ProjectsPlugin = Plugin.define(meta).pipe(
  Plugin.addModule(AppGraphBuilder),
  Plugin.addModule(CreateObject),
  Plugin.addModule(OperationHandler),
  Plugin.addModule(ReactSurface),
  Plugin.addModule(SampleSpaces),
  Plugin.addModule(Schema),
  Plugin.addModule(SkillDefinition),
  Plugin.addModule(SubjectContext),
  // Injects `Assign to agent` into plugin-tasks' task rows.
  Plugin.addModule(TaskAction),
  Plugin.addModule(Templates),
  Plugin.addModule(Translations),
  Plugin.make,
);

export default ProjectsPlugin;

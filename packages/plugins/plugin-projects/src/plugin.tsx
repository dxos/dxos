//
// Copyright 2026 DXOS.org
//

import * as Plugin from '@dxos/app-framework/Plugin';

import {
  AppGraphBuilder,
  CreateObject,
  NavigationTargetResolver,
  OperationHandler,
  ReactSurface,
  Schema,
  SkillDefinition,
  SubjectContext,
  TaskAction,
  Templates,
  Tour,
  Translations,
} from '#capabilities';
import { meta } from '#meta';

export const ProjectsPlugin = Plugin.define(meta).pipe(
  Plugin.addModule(AppGraphBuilder),
  Plugin.addModule(CreateObject),
  Plugin.addModule(NavigationTargetResolver),
  Plugin.addModule(OperationHandler),
  Plugin.addModule(ReactSurface),
  Plugin.addModule(Schema),
  Plugin.addModule(SkillDefinition),
  Plugin.addModule(SubjectContext),
  // Injects `Assign to agent`, `Copy prompt` and `Move to…` into plugin-tasks' task rows.
  Plugin.addModule(TaskAction),
  Plugin.addModule(Templates),
  Plugin.addModule(Tour),
  Plugin.addModule(Translations),
  Plugin.make,
);

export default ProjectsPlugin;

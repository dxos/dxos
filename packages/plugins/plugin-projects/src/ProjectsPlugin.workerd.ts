//
// Copyright 2026 DXOS.org
//

import { Plugin } from '@dxos/app-framework';
import { AppActivationEvents, AppPlugin } from '@dxos/app-toolkit';
import { Instructions, Project, Routine } from '@dxos/compute';

import { meta } from '#meta';

import OperationHandler from './capabilities/operation-handler';
import Templates from './capabilities/templates';

// Headless variant registered by workers (e.g. the edge operation-service): operations and schema
// only, so the React surface never reaches a bundle that cannot load it. The capability modules are
// imported directly rather than through `#capabilities`, whose barrel pulls the surface in.
export const ProjectsPlugin = Plugin.define(meta).pipe(
  AppPlugin.addOperationHandlerModule({ id: 'operation-handler', activate: OperationHandler }),
  AppPlugin.addSchemaModule({ schema: [Project.Project, Instructions.Instructions, Routine.Routine] }),
  Plugin.addModule({ id: 'templates', activatesOn: AppActivationEvents.SetupSchema, activate: Templates }),
  Plugin.make,
);

export default ProjectsPlugin;

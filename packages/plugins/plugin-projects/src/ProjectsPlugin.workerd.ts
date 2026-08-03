//
// Copyright 2026 DXOS.org
//

import { Capability, Plugin } from '@dxos/app-framework';
import { AppCapability } from '@dxos/app-toolkit';
import { Instructions, Project, Routine } from '@dxos/compute';

import { meta } from '#meta';
import { ProjectCapabilities } from '#types';

// Headless variant registered by workers (e.g. the edge operation-service): operations and schema
// only, so the React surface never reaches a bundle that cannot load it. The capability modules are
// imported directly rather than through `#capabilities`, whose barrel pulls the surface in.
const OperationHandler = AppCapability.operationHandler(() => import('./capabilities/operation-handler'));
const Templates = Capability.lazyModule(
  'Templates',
  { provides: [ProjectCapabilities.Template] },
  () => import('./capabilities/templates'),
);

export const ProjectsPlugin = Plugin.define(meta).pipe(
  Plugin.addModule(OperationHandler),
  Plugin.addModule(AppCapability.schema([Project.Project, Instructions.Instructions, Routine.Routine])),
  Plugin.addModule(Templates),
  Plugin.make,
);

export default ProjectsPlugin;

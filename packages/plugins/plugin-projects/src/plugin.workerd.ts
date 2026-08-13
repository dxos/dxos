//
// Copyright 2026 DXOS.org
//

import * as Capability from '@dxos/app-framework/Capability';
import * as Plugin from '@dxos/app-framework/Plugin';
import * as AppCapability from '@dxos/app-toolkit/AppCapability';

import { meta } from '#meta';
import { ProjectCapabilities } from '#types';

// Headless variant registered by workers (e.g. the edge operation-service): operations and schema
// only, so the React surface never reaches a bundle that cannot load it. The capability modules are
// imported directly rather than through `#capabilities`, whose barrel pulls the surface in.
const OperationHandler = AppCapability.operationHandler(() => import('./capabilities/operation-handler'));
const SkillDefinition = AppCapability.skillDefinition(() => import('./capabilities/skill-definition'));
const Templates = Capability.lazyModule(
  'Templates',
  { provides: [ProjectCapabilities.Template] },
  () => import('./capabilities/templates'),
);

export const ProjectsPlugin = Plugin.define(meta).pipe(
  Plugin.addModule(OperationHandler),
  Plugin.addModule(SkillDefinition),
  Plugin.addModule(AppCapability.schema(() => import('./schema.workerd'))),
  Plugin.addModule(Templates),
  Plugin.make,
);

export default ProjectsPlugin;

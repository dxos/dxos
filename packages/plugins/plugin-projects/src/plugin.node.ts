//
// Copyright 2026 DXOS.org
//

import * as Plugin from '@dxos/app-framework/Plugin';
import * as AppCapability from '@dxos/app-toolkit/AppCapability';

import { OperationHandler, SkillDefinition, Templates } from '#capabilities';
import { meta } from '#meta';

/** Headless variant for node hosts: `#capabilities` resolves the barrel free of React surfaces. */
export const ProjectsPlugin = Plugin.define(meta).pipe(
  Plugin.addModule(OperationHandler),
  Plugin.addModule(SkillDefinition),
  Plugin.addModule(Templates),
  Plugin.addModule(AppCapability.schema(() => import('./schema.node'))),
  Plugin.make,
);

export default ProjectsPlugin;

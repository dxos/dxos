//
// Copyright 2026 DXOS.org
//

import { Plugin } from '@dxos/app-framework';
import * as AppCapability from '@dxos/app-toolkit/AppCapability';
import * as Project from '@dxos/compute/Project';

import { AppGraphBuilder, CreateObject, OperationHandler, ReactSurface, Templates } from '#capabilities';
import { meta } from '#meta';
import { translations } from '#translations';

export const ProjectsPlugin = Plugin.define(meta).pipe(
  Plugin.addModule(AppCapability.schema([Project.Project])),
  Plugin.addModule(CreateObject),
  Plugin.addModule(Templates),
  Plugin.addModule(AppGraphBuilder),
  Plugin.addModule(OperationHandler),
  Plugin.addModule(ReactSurface),
  Plugin.addModule(AppCapability.translations(translations)),
  Plugin.make,
);

export default ProjectsPlugin;

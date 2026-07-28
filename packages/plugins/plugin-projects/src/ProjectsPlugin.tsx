//
// Copyright 2026 DXOS.org
//

import { Plugin } from '@dxos/app-framework';
import { AppCapability } from '@dxos/app-toolkit';
import { Project } from '@dxos/compute';

import { AppGraphBuilder, CreateObject, ReactSurface } from '#capabilities';
import { meta } from '#meta';
import { translations } from '#translations';

export const ProjectsPlugin = Plugin.define(meta).pipe(
  Plugin.addModule(AppCapability.schema([Project.Project])),
  Plugin.addModule(CreateObject),
  Plugin.addModule(AppGraphBuilder),
  Plugin.addModule(ReactSurface),
  Plugin.addModule(AppCapability.translations(translations)),
  Plugin.make,
);

export default ProjectsPlugin;

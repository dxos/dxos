//
// Copyright 2026 DXOS.org
//

import { Plugin } from '@dxos/app-framework';
import { AppPlugin } from '@dxos/app-toolkit';
import { Project } from '@dxos/compute';

import { AppGraphBuilder, CreateObject, NavigationResolver, ReactSurface } from '#capabilities';
import { meta } from '#meta';
import { translations } from '#translations';

export const ProjectsPlugin = Plugin.define(meta).pipe(
  AppPlugin.addSchemaModule({ schema: [Project.Project] }),
  AppPlugin.addCreateObjectModule({ activate: CreateObject }),
  AppPlugin.addAppGraphModule({ activate: AppGraphBuilder }),
  AppPlugin.addNavigationResolverModule({ activate: NavigationResolver }),
  AppPlugin.addSurfaceModule({ activate: ReactSurface }),
  AppPlugin.addTranslationsModule({ translations }),
  Plugin.make,
);

export default ProjectsPlugin;

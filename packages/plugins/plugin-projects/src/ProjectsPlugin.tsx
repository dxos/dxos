//
// Copyright 2026 DXOS.org
//

import { Plugin } from '@dxos/app-framework';
import { AppActivationEvents, AppPlugin } from '@dxos/app-toolkit';
import { Project } from '@dxos/compute';

import { AppGraphBuilder, CreateObject, OperationHandler, ReactSurface, Templates } from '#capabilities';
import { meta } from '#meta';
import { translations } from '#translations';

export const ProjectsPlugin = Plugin.define(meta).pipe(
  AppPlugin.addSchemaModule({ schema: [Project.Project] }),
  AppPlugin.addCreateObjectModule({ activate: CreateObject }),
  Plugin.addModule({ activatesOn: AppActivationEvents.SetupSchema, activate: Templates }),
  AppPlugin.addAppGraphModule({ activate: AppGraphBuilder }),
  AppPlugin.addOperationHandlerModule({ activate: OperationHandler }),
  AppPlugin.addSurfaceModule({ activate: ReactSurface }),
  AppPlugin.addTranslationsModule({ translations }),
  Plugin.make,
);

export default ProjectsPlugin;

//
// Copyright 2026 DXOS.org
//

import * as Plugin from '@dxos/app-framework/Plugin';
import * as AppCapability from '@dxos/app-toolkit/AppCapability';

import { AppGraphBuilder, CreateObject, OperationHandler, ReactSurface, Schema, Templates } from '#capabilities';
import { meta } from '#meta';
import { translations } from '#translations';

export const ProjectsPlugin = Plugin.define(meta).pipe(
  Plugin.addModule(Schema),
  Plugin.addModule(CreateObject),
  Plugin.addModule(Templates),
  Plugin.addModule(AppGraphBuilder),
  Plugin.addModule(OperationHandler),
  Plugin.addModule(ReactSurface),
  Plugin.addModule(AppCapability.translations(translations)),
  Plugin.make,
);

export default ProjectsPlugin;

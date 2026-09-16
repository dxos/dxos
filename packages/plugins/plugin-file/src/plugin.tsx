//
// Copyright 2026 DXOS.org
//

import * as Plugin from '@dxos/app-framework/Plugin';

import {
  CreateObject,
  EdgeBackend,
  FileUploader,
  InlineBackend,
  Markdown,
  OperationHandler,
  PluginAsset,
  ReactSurface,
  Schema,
  Settings,
  SkillDefinition,
  Translations,
} from '#capabilities';
import { meta } from '#meta';

export const FilePlugin = Plugin.define(meta).pipe(
  Plugin.addModule(CreateObject),
  Plugin.addModule(EdgeBackend),
  Plugin.addModule(FileUploader),
  Plugin.addModule(InlineBackend),
  Plugin.addModule(Markdown),
  Plugin.addModule(OperationHandler),
  Plugin.addModule(PluginAsset),
  Plugin.addModule(ReactSurface),
  Plugin.addModule(Schema),
  Plugin.addModule(Settings),
  Plugin.addModule(SkillDefinition),
  Plugin.addModule(Translations),
  Plugin.make,
);

export default FilePlugin;

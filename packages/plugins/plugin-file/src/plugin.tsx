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

// Canonical single-entry composition: lists every module once; per-environment filtering happens
// in the `#capabilities` barrel resolution — the generated headless barrels stub excluded modules
// as `undefined`, which `Plugin.addModule` skips.
export const FilePlugin = Plugin.define(meta).pipe(
  Plugin.addModule(SkillDefinition),
  Plugin.addModule(CreateObject),
  Plugin.addModule(OperationHandler),
  Plugin.addModule(Schema),
  Plugin.addModule(Settings),
  Plugin.addModule(ReactSurface),
  Plugin.addModule(Translations),
  Plugin.addModule(InlineBackend),
  Plugin.addModule(FileUploader),
  Plugin.addModule(EdgeBackend),
  Plugin.addModule(Markdown),
  Plugin.addModule(PluginAsset),
  Plugin.make,
);

export default FilePlugin;

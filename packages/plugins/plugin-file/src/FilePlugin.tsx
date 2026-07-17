//
// Copyright 2026 DXOS.org
//

import { Plugin } from '@dxos/app-framework';
import { AppPlugin } from '@dxos/app-toolkit';
import { Blob } from '@dxos/echo';

import {
  CreateObject,
  EdgeBackend,
  FileUploader,
  InlineBackend,
  Markdown,
  OperationHandler,
  ReactSurface,
  Settings,
  SkillDefinition,
} from '#capabilities';
import { meta } from '#meta';
import { translations } from '#translations';
import { File } from '#types';

// eslint-disable-next-line import/no-relative-packages
import pluginSpec from '../PLUGIN.mdl?raw';

export const FilePlugin = Plugin.define(meta).pipe(
  AppPlugin.addSkillDefinitionModule({
    requires: SkillDefinition.requires,
    provides: SkillDefinition.provides,
    activate: SkillDefinition,
  }),
  AppPlugin.addCreateObjectModule({
    requires: CreateObject.requires,
    provides: CreateObject.provides,
    activate: CreateObject,
  }),
  AppPlugin.addOperationHandlerModule({
    requires: OperationHandler.requires,
    provides: OperationHandler.provides,
    activate: OperationHandler,
  }),
  AppPlugin.addSchemaModule({ schema: [File.File, Blob.Blob] }),
  AppPlugin.addSettingsModule({
    requires: Settings.requires,
    provides: Settings.provides,
    activate: Settings,
  }),
  AppPlugin.addSurfaceModule({
    requires: ReactSurface.requires,
    provides: ReactSurface.provides,
    activate: ReactSurface,
  }),
  AppPlugin.addTranslationsModule({ translations }),
  Plugin.addLazyModule(InlineBackend),
  Plugin.addLazyModule(FileUploader),
  Plugin.addLazyModule(EdgeBackend),
  Plugin.addLazyModule(Markdown),
  AppPlugin.addPluginAssetModule({
    asset: { pluginId: meta.profile.key, path: 'PLUGIN.mdl', content: pluginSpec, mimeType: 'application/x-mdl' },
  }),
  Plugin.make,
);

export default FilePlugin;

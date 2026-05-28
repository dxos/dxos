//
// Copyright 2026 DXOS.org
//

import { Plugin } from '@dxos/app-framework';
import { AppActivationEvents, AppPlugin } from '@dxos/app-toolkit';
import { ClientEvents } from '@dxos/plugin-client';
import { MarkdownEvents } from '@dxos/plugin-markdown';

import {
  BlueprintDefinition,
  CreateObject,
  FileUploader,
  InlineBackend,
  Markdown,
  OperationHandler,
  ReactSurface,
  Settings,
} from '#capabilities';
import { meta } from '#meta';
import { translations } from '#translations';
import { File } from '#types';

export const FilePlugin = Plugin.define(meta).pipe(
  AppPlugin.addBlueprintDefinitionModule({ activate: BlueprintDefinition }),
  AppPlugin.addCreateObjectModule({ activate: CreateObject }),
  AppPlugin.addOperationHandlerModule({ activate: OperationHandler }),
  AppPlugin.addSchemaModule({ schema: [File.File] }),
  AppPlugin.addSettingsModule({ activate: Settings }),
  AppPlugin.addSurfaceModule({ activate: ReactSurface }),
  AppPlugin.addTranslationsModule({ translations }),
  Plugin.addModule({
    id: 'inline-backend',
    activatesOn: AppActivationEvents.SetupSchema,
    activate: InlineBackend,
  }),
  Plugin.addModule({
    id: 'file-uploader',
    activatesOn: ClientEvents.ClientReady,
    activate: FileUploader,
  }),
  Plugin.addModule({
    id: 'markdown',
    activatesOn: MarkdownEvents.SetupExtensions,
    activate: Markdown,
  }),
  Plugin.make,
);

export default FilePlugin;

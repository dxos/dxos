//
// Copyright 2025 DXOS.org
//

import { Plugin } from '@dxos/app-framework';
import { AppPlugin } from '@dxos/app-toolkit';

import {
  AppGraphBuilder,
  BlueprintDefinition,
  CreateObjects,
  OperationHandler,
  ReactSurface,
  Settings as SettingsCapability,
} from '#capabilities';
import { meta } from '#meta';
import { translations } from '#translations';
import { CodeProject, SourceFile, Spec } from '#types';

export const CodePlugin = Plugin.define(meta).pipe(
  AppPlugin.addAppGraphModule({ activate: AppGraphBuilder }),
  AppPlugin.addBlueprintDefinitionModule({ activate: BlueprintDefinition }),
  AppPlugin.addCreateObjectModule({ activate: CreateObjects }),
  AppPlugin.addOperationHandlerModule({ activate: OperationHandler }),
  AppPlugin.addSchemaModule({ schema: [Spec.Spec, CodeProject.CodeProject, SourceFile.SourceFile] }),
  AppPlugin.addSettingsModule({ activate: SettingsCapability }),
  AppPlugin.addSurfaceModule({ activate: ReactSurface }),
  AppPlugin.addTranslationsModule({ translations }),
  Plugin.make,
);

export default CodePlugin;

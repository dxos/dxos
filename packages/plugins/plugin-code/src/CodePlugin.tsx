//
// Copyright 2025 DXOS.org
//

import { Plugin } from '@dxos/app-framework';
import { AppCapability } from '@dxos/app-toolkit';

import {
  AppGraphBuilder,
  BuildRunState,
  CreateObject,
  OperationHandler,
  ReactSurface,
  Settings as SettingsCapability,
  SkillDefinition,
} from '#capabilities';
import { meta } from '#meta';
import { translations } from '#translations';
import { CodeProject, SourceFile, Spec } from '#types';

// eslint-disable-next-line import/no-relative-packages
import pluginSpec from '../PLUGIN.mdl?raw';

export const CodePlugin = Plugin.define(meta).pipe(
  Plugin.addModule(AppGraphBuilder),
  Plugin.addModule(SkillDefinition),
  Plugin.addModule(CreateObject),
  Plugin.addModule(OperationHandler),
  Plugin.addModule(AppCapability.schema([Spec.Spec, CodeProject.CodeProject, SourceFile.SourceFile])),
  Plugin.addModule(SettingsCapability),
  Plugin.addModule(ReactSurface),
  Plugin.addModule(AppCapability.translations(translations)),
  Plugin.addModule(BuildRunState),
  Plugin.addModule(
    AppCapability.pluginAsset({
      pluginId: meta.profile.key,
      path: 'PLUGIN.mdl',
      content: pluginSpec,
      mimeType: 'application/x-mdl',
    }),
  ),
  Plugin.make,
);

export default CodePlugin;

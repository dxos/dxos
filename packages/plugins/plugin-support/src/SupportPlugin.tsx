//
// Copyright 2026 DXOS.org
//

import { Plugin } from '@dxos/app-framework';
import { AppCapability } from '@dxos/app-toolkit';

import {
  AppGraphBuilder,
  CreateObject,
  HelpState,
  OnSpaceCreated,
  OperationHandler,
  ReactRoot,
  ReactSurface,
  SkillDefinition,
  SupportSettings,
} from '#capabilities';
import { meta } from '#meta';
import { translations } from '#translations';
import { Support, type Tour } from '#types';

// eslint-disable-next-line import/no-relative-packages
import pluginSpec from '../PLUGIN.mdl?raw';

export type SupportPluginOptions = { helpSteps?: Tour.Step[] };

export const SupportPlugin = Plugin.define<SupportPluginOptions>(meta).pipe(
  Plugin.addModule(AppGraphBuilder),
  Plugin.addModule(SkillDefinition),
  Plugin.addModule(CreateObject),
  Plugin.addModule(OperationHandler),
  Plugin.addModule(AppCapability.schema([Support.Ticket])),
  Plugin.addModule(ReactSurface),
  Plugin.addModule(AppCapability.translations(translations)),
  Plugin.addModule(HelpState),
  Plugin.addModule(ReactRoot),
  Plugin.addModule(OnSpaceCreated),
  Plugin.addModule(SupportSettings),
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

export default SupportPlugin;

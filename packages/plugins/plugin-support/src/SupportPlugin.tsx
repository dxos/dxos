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
  Plugin.addLazyModule(AppGraphBuilder),
  Plugin.addLazyModule(SkillDefinition),
  Plugin.addLazyModule(CreateObject),
  Plugin.addLazyModule(OperationHandler),
  Plugin.addLazyModule(AppCapability.schema([Support.Ticket])),
  Plugin.addLazyModule(ReactSurface),
  Plugin.addLazyModule(AppCapability.translations(translations)),
  Plugin.addLazyModule(HelpState),
  Plugin.addLazyModule(ReactRoot),
  Plugin.addLazyModule(OnSpaceCreated),
  Plugin.addLazyModule(SupportSettings, { id: 'settings' }),
  Plugin.addLazyModule(
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

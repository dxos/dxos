//
// Copyright 2026 DXOS.org
//

import * as Plugin from '@dxos/app-framework/Plugin';
import * as AppCapability from '@dxos/app-toolkit/AppCapability';

import {
  AppGraphBuilder,
  CreateObject,
  HelpState,
  OperationHandler,
  ReactRoot,
  ReactSurface,
  Schema,
  SkillDefinition,
  SupportSettings,
} from '#capabilities';
import { meta } from '#meta';
import { translations } from '#translations';
import { Tour } from '#types';

// eslint-disable-next-line import/no-relative-packages
import pluginSpec from '../PLUGIN.mdl?raw';

export type SupportPluginOptions = { helpSteps?: Tour.Step[] };

export const SupportPlugin = Plugin.define<SupportPluginOptions>(meta).pipe(
  Plugin.addModule(AppGraphBuilder),
  Plugin.addModule(CreateObject),
  Plugin.addModule(HelpState),
  Plugin.addModule(OperationHandler),
  Plugin.addModule(ReactRoot),
  Plugin.addModule(ReactSurface),
  Plugin.addModule(Schema),
  Plugin.addModule(SkillDefinition),
  Plugin.addModule(SupportSettings),
  Plugin.addModule(AppCapability.translations(translations)),
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

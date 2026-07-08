//
// Copyright 2026 DXOS.org
//

import { ActivationEvent, ActivationEvents, Plugin } from '@dxos/app-framework';
import { AppActivationEvents, AppPlugin } from '@dxos/app-toolkit';
import { AttentionEvents } from '@dxos/plugin-attention';

import { AppGraphBuilder, FactStore, OperationHandler, ReactSurface, SkillDefinition } from '#capabilities';
import { meta } from '#meta';
import { translations } from '#translations';

// eslint-disable-next-line import/no-relative-packages
import pluginSpec from '../PLUGIN.mdl?raw';

export const BrainPlugin = Plugin.define(meta).pipe(
  Plugin.addModule({
    id: 'fact-store',
    activatesOn: ActivationEvents.SetupProcessManager,
    activate: FactStore,
  }),
  AppPlugin.addAppGraphModule({
    activatesOn: ActivationEvent.allOf(AppActivationEvents.SetupAppGraph, AttentionEvents.AttentionReady),
    activate: AppGraphBuilder,
  }),
  AppPlugin.addOperationHandlerModule({ activate: OperationHandler }),
  AppPlugin.addSkillDefinitionModule({ activate: SkillDefinition }),
  AppPlugin.addSurfaceModule({ activate: ReactSurface }),
  AppPlugin.addPluginAssetModule({
    asset: { pluginId: meta.profile.key, path: 'PLUGIN.mdl', content: pluginSpec, mimeType: 'application/x-mdl' },
  }),
  AppPlugin.addTranslationsModule({ translations }),
  Plugin.make,
);

export default BrainPlugin;

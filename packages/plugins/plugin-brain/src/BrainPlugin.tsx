//
// Copyright 2026 DXOS.org
//

import { ActivationEvents, Plugin } from '@dxos/app-framework';
import { AppPlugin } from '@dxos/app-toolkit';

import { FactStore, OperationHandler, ReactSurface, Settings, SkillDefinition } from '#capabilities';
import { meta } from '#meta';
import { translations } from '#translations';

// eslint-disable-next-line import/no-relative-packages
import pluginSpec from '../PLUGIN.mdl?raw';

export const BrainPlugin = Plugin.define(meta).pipe(
  AppPlugin.addOperationHandlerModule({ activate: OperationHandler }),
  AppPlugin.addSkillDefinitionModule({ activate: SkillDefinition }),
  AppPlugin.addSurfaceModule({ activate: ReactSurface }),
  AppPlugin.addPluginAssetModule({
    asset: { pluginId: meta.profile.key, path: 'PLUGIN.mdl', content: pluginSpec, mimeType: 'application/x-mdl' },
  }),
  AppPlugin.addTranslationsModule({ translations }),
  // Provisions the per-space FactStore/FeedCursors LayerSpecs + registry; the mailbox `EnrichMailbox`
  // operation (in plugin-inbox) resolves these at invoke time, so BrainPlugin must be loaded wherever
  // enrich runs.
  Plugin.addModule({
    activatesOn: ActivationEvents.SetupProcessManager,
    activate: FactStore,
  }),
  // Owns the enrichment settings and injects the `Enrich` action into plugin-inbox's mailbox toolbar
  // menu (facts extraction is owned by brain), reading model/provider/strict from the settings live.
  Plugin.addModule({
    activatesOn: ActivationEvents.SetupSettings,
    activate: Settings,
  }),
  Plugin.make,
);

export default BrainPlugin;

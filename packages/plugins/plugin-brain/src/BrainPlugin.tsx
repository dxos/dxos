//
// Copyright 2026 DXOS.org
//

import { ActivationEvents, Plugin } from '@dxos/app-framework';
import { AppActivationEvents, AppPlugin } from '@dxos/app-toolkit';
import { Topic } from '@dxos/types';

import { FactStore, MailboxAction, OperationHandler, ReactSurface, Settings, SkillDefinition } from '#capabilities';
import { meta } from '#meta';
import { translations } from '#translations';

// eslint-disable-next-line import/no-relative-packages
import pluginSpec from '../PLUGIN.mdl?raw';

export const BrainPlugin = Plugin.define(meta).pipe(
  AppPlugin.addOperationHandlerModule({ activate: OperationHandler }),
  AppPlugin.addSkillDefinitionModule({ activate: SkillDefinition }),
  AppPlugin.addSchemaModule({ schema: [Topic.Topic] }),
  AppPlugin.addSurfaceModule({ activate: ReactSurface }),
  AppPlugin.addPluginAssetModule({
    asset: { pluginId: meta.profile.key, path: 'PLUGIN.mdl', content: pluginSpec, mimeType: 'application/x-mdl' },
  }),
  AppPlugin.addTranslationsModule({ translations }),
  // Provisions the per-space FactStore/FeedCursors LayerSpecs + registry; the mailbox `AnalyzeMailbox`
  // operation (in plugin-inbox) resolves these at invoke time, so BrainPlugin must be loaded wherever
  // analysis runs.
  Plugin.addModule({
    activatesOn: ActivationEvents.SetupProcessManager,
    activate: FactStore,
  }),
  // Owns the fact-analysis settings (model/provider/strict) and registers them in the settings UI.
  Plugin.addModule({
    activatesOn: AppActivationEvents.SetupSettings,
    activate: Settings,
  }),
  // Injects the `Analyze` action into plugin-inbox's mailbox toolbar menu (fact analysis is owned by
  // brain); reads the settings atom live at invoke time. Shares the atom with the Settings module.
  Plugin.addModule({
    activatesOn: AppActivationEvents.SetupSettings,
    activate: MailboxAction,
  }),
  Plugin.make,
);

export default BrainPlugin;

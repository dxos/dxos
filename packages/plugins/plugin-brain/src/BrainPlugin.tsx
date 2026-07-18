//
// Copyright 2026 DXOS.org
//

import { Plugin } from '@dxos/app-framework';
import { AppPlugin } from '@dxos/app-toolkit';

import { FactStore, MailboxAction, OperationHandler, ReactSurface, Settings, SkillDefinition } from '#capabilities';
import { meta } from '#meta';
import { translations } from '#translations';

// eslint-disable-next-line import/no-relative-packages
import pluginSpec from '../PLUGIN.mdl?raw';

export const BrainPlugin = Plugin.define(meta).pipe(
  AppPlugin.addOperationHandlerModule<void>({
    requires: OperationHandler.requires,
    provides: OperationHandler.provides,
    activate: OperationHandler,
  }),
  AppPlugin.addSkillDefinitionModule<void>({
    requires: SkillDefinition.requires,
    provides: SkillDefinition.provides,
    activate: SkillDefinition,
  }),
  AppPlugin.addSurfaceModule<void>({
    requires: ReactSurface.requires,
    provides: ReactSurface.provides,
    activate: ReactSurface,
  }),
  AppPlugin.addPluginAssetModule<void>({
    asset: { pluginId: meta.profile.key, path: 'PLUGIN.mdl', content: pluginSpec, mimeType: 'application/x-mdl' },
  }),
  AppPlugin.addTranslationsModule<void>({ translations }),
  // Provisions the per-space FactStore LayerSpec + registry; the mailbox `AnalyzeMailbox` operation
  // (in plugin-inbox) resolves these at invoke time, so BrainPlugin must be loaded wherever analysis
  // runs.
  Plugin.addLazyModule(FactStore),
  // Owns the fact-analysis settings (model/provider/strict) and registers them in the settings UI.
  Plugin.addLazyModule(Settings),
  // Injects the `Analyze` action into plugin-inbox's mailbox toolbar menu (fact analysis is owned by
  // brain); reads the settings atom live at invoke time. Shares the atom with the Settings module.
  Plugin.addLazyModule(MailboxAction),
  Plugin.make,
);

export default BrainPlugin;

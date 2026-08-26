//
// Copyright 2026 DXOS.org
//

import * as Plugin from '@dxos/app-framework/Plugin';

import {
  FactStore,
  MailboxProcessor,
  OperationHandler,
  PluginAsset,
  ProjectTemplates,
  ReactSurface,
  ReplyGenerator,
  Settings,
  SkillDefinition,
  Translations,
} from '#capabilities';
import { meta } from '#meta';

export const BrainPlugin = Plugin.define(meta).pipe(
  // Provisions the per-space FactStore LayerSpec + registry; the mailbox `AnalyzeMailbox` operation
  // (in plugin-inbox) resolves these at invoke time, so BrainPlugin must be loaded wherever analysis
  // runs.
  Plugin.addModule(FactStore),
  // Injects the `Analyze` action into plugin-inbox's mailbox toolbar menu (fact analysis is owned by
  // brain); reads the settings atom live at invoke time. Shares the atom with the Settings module.
  Plugin.addModule(MailboxProcessor),
  Plugin.addModule(OperationHandler),
  // Contributes the "Mailbox Facts" project template: a scheduled AnalyzeMailbox routine plus
  // brain-skill chats, scoped to one project.
  Plugin.addModule(PluginAsset),
  Plugin.addModule(ProjectTemplates),
  Plugin.addModule(ReactSurface),
  Plugin.addModule(ReplyGenerator),
  // Owns the fact-analysis settings (model/provider/strict) and registers them in the settings UI.
  Plugin.addModule(Settings),
  Plugin.addModule(SkillDefinition),
  Plugin.addModule(Translations),
  Plugin.make,
);

export default BrainPlugin;

//
// Copyright 2026 DXOS.org
//

import { Plugin } from '@dxos/app-framework';
import * as AppCapability from '@dxos/app-toolkit/AppCapability';

import {
  FactStore,
  MailboxAction,
  OperationHandler,
  ProjectTemplates,
  ReactSurface,
  Settings,
  SkillDefinition,
} from '#capabilities';
import { meta } from '#meta';
import { translations } from '#translations';

// eslint-disable-next-line import/no-relative-packages
import pluginSpec from '../PLUGIN.mdl?raw';

export const BrainPlugin = Plugin.define(meta).pipe(
  Plugin.addModule(OperationHandler),
  Plugin.addModule(SkillDefinition),
  Plugin.addModule(ReactSurface),
  Plugin.addModule(
    AppCapability.pluginAsset({
      pluginId: meta.profile.key,
      path: 'PLUGIN.mdl',
      content: pluginSpec,
      mimeType: 'application/x-mdl',
    }),
  ),
  Plugin.addModule(AppCapability.translations(translations)),
  // Provisions the per-space FactStore LayerSpec + registry; the mailbox `AnalyzeMailbox` operation
  // (in plugin-inbox) resolves these at invoke time, so BrainPlugin must be loaded wherever analysis
  // runs.
  Plugin.addModule(FactStore),
  // Owns the fact-analysis settings (model/provider/strict) and registers them in the settings UI.
  Plugin.addModule(Settings),
  // Injects the `Analyze` action into plugin-inbox's mailbox toolbar menu (fact analysis is owned by
  // brain); reads the settings atom live at invoke time. Shares the atom with the Settings module.
  Plugin.addModule(MailboxAction),
  // Contributes the "Mailbox Facts" project template: a scheduled AnalyzeMailbox routine plus
  // brain-skill chats, scoped to one project.
  Plugin.addModule(ProjectTemplates),
  Plugin.make,
);

export default BrainPlugin;

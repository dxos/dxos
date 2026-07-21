//
// Copyright 2026 DXOS.org
//

import { Plugin } from '@dxos/app-framework';
import { AppCapability } from '@dxos/app-toolkit';
import { Topic } from '@dxos/compute';

import {
  AppGraphBuilder,
  CreateObject,
  FactStore,
  MailboxAction,
  NavigationResolver,
  OperationHandler,
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
  Plugin.addModule(AppCapability.schema([Topic.Topic])),
  Plugin.addModule(CreateObject),
  Plugin.addModule(AppGraphBuilder),
  Plugin.addModule(NavigationResolver),
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
  Plugin.make,
);

export default BrainPlugin;

//
// Copyright 2026 DXOS.org
//

import * as Plugin from '@dxos/app-framework/Plugin';

import {
  AppGraphBuilder,
  AutomationTemplates,
  MailboxAction,
  MailboxProcessor,
  OperationHandler,
  PluginAsset,
  ProjectTemplates,
  Schema,
  SenderAction,
  SkillDefinition,
  Translations,
} from '#capabilities';
import { meta } from '#meta';

export const CrmPlugin = Plugin.define(meta).pipe(
  Plugin.addModule(AppGraphBuilder),
  Plugin.addModule(AutomationTemplates),
  // Injects the `Process CRM` action into plugin-inbox's mailbox toolbar menu.
  Plugin.addModule(MailboxAction),
  Plugin.addModule(MailboxProcessor),
  Plugin.addModule(OperationHandler),
  Plugin.addModule(PluginAsset),
  Plugin.addModule(ProjectTemplates),
  Plugin.addModule(Schema),
  Plugin.addModule(SenderAction),
  Plugin.addModule(SkillDefinition),
  Plugin.addModule(Translations),
  Plugin.make,
);

export default CrmPlugin;

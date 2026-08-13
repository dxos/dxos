//
// Copyright 2026 DXOS.org
//

import * as Plugin from '@dxos/app-framework/Plugin';
import * as AppCapability from '@dxos/app-toolkit/AppCapability';

import {
  AppGraphBuilder,
  AutomationTemplates,
  MailboxAction,
  SenderAction,
  OperationHandler,
  ProjectTemplates,
  SkillDefinition,
} from '#capabilities';
import { meta } from '#meta';
import { translations } from '#translations';

// eslint-disable-next-line import/no-relative-packages
import pluginSpec from '../PLUGIN.mdl?raw';

export const CrmPlugin = Plugin.define(meta).pipe(
  Plugin.addModule(SkillDefinition),
  Plugin.addModule(AppCapability.translations(translations)),
  Plugin.addModule(OperationHandler),
  Plugin.addModule(AppGraphBuilder),
  Plugin.addModule(AppCapability.schema(() => import('./schema'))),
  Plugin.addModule(AutomationTemplates),
  // Injects the `Process CRM` action into plugin-inbox's mailbox toolbar menu.
  Plugin.addModule(MailboxAction),
  Plugin.addModule(SenderAction),
  Plugin.addModule(ProjectTemplates),
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

export default CrmPlugin;

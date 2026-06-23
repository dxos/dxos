//
// Copyright 2026 DXOS.org
//

import { Plugin } from '@dxos/app-framework';
import { AppPlugin, AppActivationEvents } from '@dxos/app-toolkit';

import { AutomationTemplates, SkillDefinition, OperationHandler } from '#capabilities';
import { meta } from '#meta';
import { translations } from '#translations';
import { ProfileOf } from '#types';

// eslint-disable-next-line import/no-relative-packages
import pluginSpec from '../PLUGIN.mdl?raw';

export const CrmPlugin = Plugin.define(meta).pipe(
  AppPlugin.addSkillDefinitionModule({ activate: SkillDefinition }),
  AppPlugin.addTranslationsModule({ translations }),
  AppPlugin.addOperationHandlerModule({ activate: OperationHandler }),
  AppPlugin.addSchemaModule({ schema: [ProfileOf.ProfileOf] }),
  Plugin.addModule({
    id: 'crm-automation-templates',
    activatesOn: AppActivationEvents.SetupSchema,
    activate: AutomationTemplates,
  }),
  AppPlugin.addPluginAssetModule({
    asset: { pluginId: meta.profile.key, path: 'PLUGIN.mdl', content: pluginSpec, mimeType: 'application/x-mdl' },
  }),
  Plugin.make,
);

export default CrmPlugin;

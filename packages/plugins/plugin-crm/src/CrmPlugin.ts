//
// Copyright 2026 DXOS.org
//

import { Plugin } from '@dxos/app-framework';
import { AppActivationEvents, AppPlugin } from '@dxos/app-toolkit';

import { AppGraphBuilder, AutomationTemplates, OperationHandler, ReactSurface, SkillDefinition } from '#capabilities';
import { meta } from '#meta';
import { translations } from '#translations';
import { ProfileOf } from '#types';

// eslint-disable-next-line import/no-relative-packages
import pluginSpec from '../PLUGIN.mdl?raw';

export const CrmPlugin = Plugin.define(meta).pipe(
  AppPlugin.addSkillDefinitionModule({ activate: SkillDefinition }),
  AppPlugin.addTranslationsModule({ translations }),
  AppPlugin.addOperationHandlerModule({ activate: OperationHandler }),
  AppPlugin.addSurfaceModule({ activate: ReactSurface }),
  AppPlugin.addAppGraphModule({ activate: AppGraphBuilder }),
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

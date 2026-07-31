//
// Copyright 2025 DXOS.org
//

import { ActivationEvent, Plugin } from '@dxos/app-framework';
import { AppActivationEvents, AppPlugin } from '@dxos/app-toolkit';
import { Instructions } from '@dxos/compute';
import { AttentionEvents } from '@dxos/plugin-attention';
import { StateMap, TagIndex } from '@dxos/schema';

import {
  AppGraphBuilder,
  CreateObject,
  OperationHandler,
  ReactSurface,
  RoutineTemplates,
  SkillDefinition,
} from '#capabilities';
import { meta } from '#meta';
import { translations } from '#translations';
import { Magazine, Subscription } from '#types';

// eslint-disable-next-line import/no-relative-packages
import pluginSpec from '../PLUGIN.mdl?raw';

export const MagazinePlugin = Plugin.define(meta).pipe(
  AppPlugin.addAppGraphModule({
    activatesOn: ActivationEvent.allOf(AppActivationEvents.SetupAppGraph, AttentionEvents.AttentionReady),
    activate: AppGraphBuilder,
  }),
  AppPlugin.addCreateObjectModule({ activate: CreateObject }),
  AppPlugin.addOperationHandlerModule({ activate: OperationHandler }),
  AppPlugin.addPluginAssetModule({
    asset: { pluginId: meta.profile.key, path: 'PLUGIN.mdl', content: pluginSpec, mimeType: 'application/x-mdl' },
  }),
  AppPlugin.addSchemaModule({
    schema: [
      Subscription.Subscription,
      Subscription.Post,
      Subscription.PostContent,
      Magazine.Magazine,
      Instructions.Instructions,
      StateMap.StateMap,
      TagIndex.TagIndex,
    ],
  }),
  AppPlugin.addSkillDefinitionModule({ activate: SkillDefinition }),
  AppPlugin.addSurfaceModule({ activate: ReactSurface }),
  AppPlugin.addTranslationsModule({ translations }),
  Plugin.addModule({
    id: 'magazine-automation-templates',
    activatesOn: AppActivationEvents.SetupSchema,
    activate: RoutineTemplates,
  }),
  Plugin.make,
);

export default MagazinePlugin;

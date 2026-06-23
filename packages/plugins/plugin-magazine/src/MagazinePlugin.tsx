//
// Copyright 2025 DXOS.org
//

import { ActivationEvent, Plugin } from '@dxos/app-framework';
import { AppActivationEvents, AppPlugin } from '@dxos/app-toolkit';
import { Instructions } from '@dxos/compute';
import { AttentionEvents } from '@dxos/plugin-attention';
import { StateMap, TagIndex } from '@dxos/schema';

import { AppGraphBuilder, SkillDefinition, CreateObject, OperationHandler, ReactSurface } from '#capabilities';
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
  AppPlugin.addSkillDefinitionModule({ activate: SkillDefinition }),
  AppPlugin.addCreateObjectModule({ activate: CreateObject }),
  AppPlugin.addOperationHandlerModule({ activate: OperationHandler }),
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
  AppPlugin.addSurfaceModule({ activate: ReactSurface }),
  AppPlugin.addTranslationsModule({ translations }),
  AppPlugin.addPluginAssetModule({
    asset: { pluginId: meta.profile.key, path: 'PLUGIN.mdl', content: pluginSpec, mimeType: 'application/x-mdl' },
  }),
  Plugin.make,
);

export default MagazinePlugin;

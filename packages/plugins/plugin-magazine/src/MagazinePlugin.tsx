//
// Copyright 2025 DXOS.org
//

import { Plugin } from '@dxos/app-framework';
import { AppPlugin } from '@dxos/app-toolkit';
import { Instructions } from '@dxos/compute';
import { StateMap, TagIndex } from '@dxos/schema';

import {
  AppGraphBuilder,
  CreateObject,
  NavigationResolver,
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
    requires: AppGraphBuilder.requires,
    provides: AppGraphBuilder.provides,
    activate: AppGraphBuilder,
  }),
  AppPlugin.addCreateObjectModule({
    requires: CreateObject.requires,
    provides: CreateObject.provides,
    activate: CreateObject,
  }),
  AppPlugin.addNavigationResolverModule({
    requires: NavigationResolver.requires,
    provides: NavigationResolver.provides,
    activate: NavigationResolver,
  }),
  AppPlugin.addOperationHandlerModule({
    requires: OperationHandler.requires,
    provides: OperationHandler.provides,
    activate: OperationHandler,
  }),
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
  AppPlugin.addSkillDefinitionModule({
    requires: SkillDefinition.requires,
    provides: SkillDefinition.provides,
    activate: SkillDefinition,
  }),
  AppPlugin.addSurfaceModule({
    requires: ReactSurface.requires,
    provides: ReactSurface.provides,
    activate: ReactSurface,
  }),
  AppPlugin.addTranslationsModule({ translations }),
  Plugin.addModule({
    id: 'magazine-automation-templates',
    requires: RoutineTemplates.requires,
    provides: RoutineTemplates.provides,
    activate: RoutineTemplates,
  }),
  Plugin.make,
);

export default MagazinePlugin;

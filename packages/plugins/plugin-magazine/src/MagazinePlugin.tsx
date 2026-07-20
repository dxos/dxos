//
// Copyright 2025 DXOS.org
//

import { Plugin } from '@dxos/app-framework';
import { AppCapability } from '@dxos/app-toolkit';
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
  Plugin.addLazyModule(AppGraphBuilder),
  Plugin.addLazyModule(CreateObject),
  Plugin.addLazyModule(NavigationResolver),
  Plugin.addLazyModule(OperationHandler),
  Plugin.addLazyModule(
    AppCapability.pluginAsset({
      pluginId: meta.profile.key,
      path: 'PLUGIN.mdl',
      content: pluginSpec,
      mimeType: 'application/x-mdl',
    }),
  ),
  Plugin.addLazyModule(
    AppCapability.schema([
      Subscription.Subscription,
      Subscription.Post,
      Subscription.PostContent,
      Magazine.Magazine,
      Instructions.Instructions,
      StateMap.StateMap,
      TagIndex.TagIndex,
    ]),
  ),
  Plugin.addLazyModule(SkillDefinition),
  Plugin.addLazyModule(ReactSurface),
  Plugin.addLazyModule(AppCapability.translations(translations)),
  Plugin.addLazyModule(RoutineTemplates),
  Plugin.make,
);

export default MagazinePlugin;

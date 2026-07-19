//
// Copyright 2026 DXOS.org
//

import { Plugin } from '@dxos/app-framework';
import { AppCapability } from '@dxos/app-toolkit';
import { StateMap, TagIndex } from '@dxos/schema';

import { OperationHandler, SkillDefinition } from '#capabilities';
import { meta } from '#meta';
import { Magazine, Subscription } from '#types';

export const MagazinePlugin = Plugin.define(meta).pipe(
  Plugin.addLazyModule(SkillDefinition),
  Plugin.addLazyModule(OperationHandler),
  Plugin.addLazyModule(
    AppCapability.schema([
      Subscription.Subscription,
      Subscription.Post,
      Subscription.PostContent,
      Magazine.Magazine,
      StateMap.StateMap,
      TagIndex.TagIndex,
    ]),
  ),
  Plugin.make,
);

export default MagazinePlugin;

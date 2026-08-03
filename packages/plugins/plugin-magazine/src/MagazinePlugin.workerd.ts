//
// Copyright 2026 DXOS.org
//

import * as Plugin from '@dxos/app-framework/Plugin';
import * as AppCapability from '@dxos/app-toolkit/AppCapability';
import { StateMap, TagIndex } from '@dxos/schema';

import { OperationHandler, SkillDefinition } from '#capabilities';
import { meta } from '#meta';

import * as Magazine from './types/Magazine';
import * as Subscription from './types/Subscription';

export const MagazinePlugin = Plugin.define(meta).pipe(
  Plugin.addModule(SkillDefinition),
  Plugin.addModule(OperationHandler),
  Plugin.addModule(
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

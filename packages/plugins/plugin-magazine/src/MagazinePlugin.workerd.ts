//
// Copyright 2026 DXOS.org
//

import { Capabilities, Plugin } from '@dxos/app-framework';
import { AppCapabilities, AppPlugin } from '@dxos/app-toolkit';
import { StateMap, TagIndex } from '@dxos/schema';

import { meta } from '#meta';
import { Magazine, Subscription } from '#types';

import OperationHandler from './capabilities/operation-handler';
import SkillDefinition from './capabilities/skill-definition';

export const MagazinePlugin = Plugin.define(meta).pipe(
  AppPlugin.addSkillDefinitionModule({
    id: 'skill-definition',
    requires: [],
    provides: [AppCapabilities.SkillDefinition],
    activate: SkillDefinition,
  }),
  AppPlugin.addOperationHandlerModule({
    id: 'operation-handler',
    requires: [],
    provides: [Capabilities.OperationHandler],
    activate: OperationHandler,
  }),
  AppPlugin.addSchemaModule({
    schema: [
      Subscription.Subscription,
      Subscription.Post,
      Subscription.PostContent,
      Magazine.Magazine,
      StateMap.StateMap,
      TagIndex.TagIndex,
    ],
  }),
  Plugin.make,
);

export default MagazinePlugin;

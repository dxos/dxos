//
// Copyright 2025 DXOS.org
//

import * as AppCapability from '@dxos/app-toolkit/AppCapability';
import * as Instructions from '@dxos/compute/Instructions';
import { StateMap, TagIndex } from '@dxos/schema';

import { Magazine, Subscription } from '#types';

export const Schema = AppCapability.schema([
  Subscription.Subscription,
  Subscription.Post,
  Subscription.PostContent,
  Magazine.Magazine,
  Instructions.Instructions,
  StateMap.StateMap,
  TagIndex.TagIndex,
]);

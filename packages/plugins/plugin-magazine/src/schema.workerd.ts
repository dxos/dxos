//
// Copyright 2026 DXOS.org
//

import { StateMap, TagIndex } from '@dxos/schema';

import { Magazine, Subscription } from '#types';

/**
 * Schemas this plugin registers, loaded on demand: the capability activates at idle,
 * so naming them here keeps them out of the plugin body's module graph.
 */
export default [
  Subscription.Subscription,
  Subscription.Post,
  Subscription.PostContent,
  Magazine.Magazine,
  StateMap.StateMap,
  TagIndex.TagIndex,
];

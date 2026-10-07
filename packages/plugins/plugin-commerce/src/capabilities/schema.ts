//
// Copyright 2026 DXOS.org
//

import { TagIndex } from '@dxos/schema';

import { Provider, Result, Search } from '#types';

/**
 * Schemas this plugin registers, loaded on demand: the capability activates at idle,
 * so naming them here keeps them out of the plugin body's module graph.
 */
export default [Provider.Provider, Search.Search, Result.Result, TagIndex.TagIndex];

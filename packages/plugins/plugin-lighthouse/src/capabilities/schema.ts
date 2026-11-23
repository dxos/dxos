//
// Copyright 2026 DXOS.org
//

import { TagIndex } from '@dxos/schema';

import { Finding, Research } from '#types';

/** Schemas this plugin registers, loaded on demand so they stay out of the plugin body's module graph. */
export default [Research.Research, Finding.Finding, TagIndex.TagIndex];

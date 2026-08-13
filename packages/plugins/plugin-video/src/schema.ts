//
// Copyright 2026 DXOS.org
//

import { Text } from '@dxos/schema';

import { Video } from '#types';

/**
 * Schemas this plugin registers, loaded on demand: the capability activates at idle,
 * so naming them here keeps them out of the plugin body's module graph.
 */
export default [Video.Video, Text.Text];

//
// Copyright 2023 DXOS.org
//

import { Pipeline } from '@dxos/types';

/**
 * Schemas this plugin registers, loaded on demand: the capability activates at idle,
 * so naming them here keeps them out of the plugin body's module graph.
 */
export default [Pipeline.Pipeline];

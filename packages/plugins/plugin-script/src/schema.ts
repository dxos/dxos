//
// Copyright 2023 DXOS.org
//

import * as Script from '@dxos/compute/Script';

/**
 * Schemas this plugin registers, loaded on demand: the capability activates at idle,
 * so naming them here keeps them out of the plugin body's module graph.
 */
export default [Script.Script];

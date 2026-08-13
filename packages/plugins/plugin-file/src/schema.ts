//
// Copyright 2026 DXOS.org
//

import { Blob } from '@dxos/echo';
import { File } from '@dxos/types';

/**
 * Schemas this plugin registers, loaded on demand: the capability activates at idle,
 * so naming them here keeps them out of the plugin body's module graph.
 */
export default [File.File, Blob.Blob];

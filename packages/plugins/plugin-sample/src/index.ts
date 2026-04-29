//
// Copyright 2025 DXOS.org
//

// Public API exports.
// Only export what external consumers need: the plugin factory and metadata.
// Types and operations are available via the `./types` and `./operations` subpath exports.

import { Plugin } from '@dxos/app-framework';

import { meta } from './meta';

export { meta };
export const SamplePlugin = Plugin.lazy(meta, () => import('./SamplePlugin'));

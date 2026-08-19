//
// Copyright 2023 DXOS.org
//

import * as Plugin from '@dxos/app-framework/Plugin';

import { Schema } from '#capabilities';
import { meta } from '#meta';

import type { PreviewPluginOptions } from './types';

// Headless variant registered by workers (e.g. the edge operation-service). The capabilities come
// from `#capabilities`, which resolves a server-safe barrel under the `workerd` condition — the
// browser barrel declares React surfaces, and a bundler follows the dynamic import behind a lazy
// capability, so resolving it here would drag React into a bundle that cannot load it.
export const PreviewPlugin = Plugin.define<PreviewPluginOptions>(meta).pipe(
  Plugin.addModule(Schema),

  Plugin.make,
);

export default PreviewPlugin;

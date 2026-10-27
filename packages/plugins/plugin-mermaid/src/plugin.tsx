//
// Copyright 2023 DXOS.org
//

import * as Plugin from '@dxos/app-framework/Plugin';

import { MarkdownExtension, PluginAsset } from '#capabilities';
import { meta } from '#meta';

export const MermaidPlugin = Plugin.define(meta).pipe(
  Plugin.addModule(MarkdownExtension),
  Plugin.addModule(PluginAsset),
  Plugin.make,
);

export default MermaidPlugin;

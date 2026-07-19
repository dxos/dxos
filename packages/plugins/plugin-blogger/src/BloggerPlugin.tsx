//
// Copyright 2026 DXOS.org
//

import { Plugin } from '@dxos/app-framework';
import { AppCapability } from '@dxos/app-toolkit';

import { AppGraphBuilder, CreateObject, OperationHandler, ReactSurface } from '#capabilities';
import { meta } from '#meta';
import { translations } from '#translations';
import { Blog } from '#types';

// eslint-disable-next-line import/no-relative-packages
import pluginSpec from '../PLUGIN.mdl?raw';

export const BloggerPlugin = Plugin.define(meta).pipe(
  Plugin.addLazyModule(AppCapability.schema([Blog.Publication, Blog.Post])),
  Plugin.addLazyModule(
    AppCapability.pluginAsset({
      pluginId: meta.profile.key,
      path: 'PLUGIN.mdl',
      content: pluginSpec,
      mimeType: 'application/x-mdl',
    }),
  ),
  Plugin.addLazyModule(AppCapability.translations(translations)),
  Plugin.addLazyModule(ReactSurface),
  Plugin.addLazyModule(OperationHandler),
  Plugin.addLazyModule(CreateObject),
  Plugin.addLazyModule(AppGraphBuilder),
  Plugin.make,
);

export default BloggerPlugin;

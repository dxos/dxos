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
  Plugin.addModule(AppCapability.schema([Blog.Publication, Blog.Post])),
  Plugin.addModule(
    AppCapability.pluginAsset({
      pluginId: meta.profile.key,
      path: 'PLUGIN.mdl',
      content: pluginSpec,
      mimeType: 'application/x-mdl',
    }),
  ),
  Plugin.addModule(AppCapability.translations(translations)),
  Plugin.addModule(ReactSurface),
  Plugin.addModule(OperationHandler),
  Plugin.addModule(CreateObject),
  Plugin.addModule(AppGraphBuilder),
  Plugin.make,
);

export default BloggerPlugin;

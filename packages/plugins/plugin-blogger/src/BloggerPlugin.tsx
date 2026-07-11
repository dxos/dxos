//
// Copyright 2026 DXOS.org
//

import { Plugin } from '@dxos/app-framework';
import { AppPlugin } from '@dxos/app-toolkit';

import { CreateObject, OperationHandler, ReactSurface } from '#capabilities';
import { meta } from '#meta';
import { translations } from '#translations';
import { Blogger } from '#types';

export const BloggerPlugin = Plugin.define(meta).pipe(
  AppPlugin.addSchemaModule({ schema: [Blogger.Publication, Blogger.Post, Blogger.Draft] }),
  AppPlugin.addTranslationsModule({ translations }),
  AppPlugin.addSurfaceModule({ activate: ReactSurface }),
  AppPlugin.addOperationHandlerModule({ activate: OperationHandler }),
  AppPlugin.addCreateObjectModule({ activate: CreateObject }),
  Plugin.make,
);

export default BloggerPlugin;

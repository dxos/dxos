//
// Copyright 2026 DXOS.org
//

import { ActivationEvents, Plugin } from '@dxos/app-framework';
import { AppPlugin } from '@dxos/app-toolkit';
import { Text } from '@dxos/schema';

import { CommentConfig, OperationHandler, PageActionProvider, ReactSurface } from '#capabilities';
import { meta } from '#meta';
import { translations } from '#translations';
import { Bookmark } from '#types';

// eslint-disable-next-line import/no-relative-packages
import pluginSpec from '../PLUGIN.mdl?raw';

export const BookmarksPlugin = Plugin.define(meta).pipe(
  AppPlugin.addCommentConfigModule({ activate: CommentConfig }),
  AppPlugin.addSchemaModule({ schema: [Bookmark.Bookmark, Text.Text] }),
  AppPlugin.addOperationHandlerModule({ activate: OperationHandler }),
  Plugin.addModule({
    id: 'page-action',
    activatesOn: ActivationEvents.Startup,
    activate: PageActionProvider,
  }),
  AppPlugin.addSurfaceModule({ activate: ReactSurface }),
  AppPlugin.addTranslationsModule({ translations }),
  AppPlugin.addPluginAssetModule({
    asset: { pluginId: meta.profile.key, path: 'PLUGIN.mdl', content: pluginSpec, mimeType: 'application/x-mdl' },
  }),
  Plugin.make,
);

export default BookmarksPlugin;

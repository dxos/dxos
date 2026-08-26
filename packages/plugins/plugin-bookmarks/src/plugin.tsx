//
// Copyright 2026 DXOS.org
//

import * as Plugin from '@dxos/app-framework/Plugin';

import {
  CommentConfig,
  OperationHandler,
  PageActionProvider,
  PluginAsset,
  ReactSurface,
  Schema,
  Translations,
} from '#capabilities';
import { meta } from '#meta';

export const BookmarksPlugin = Plugin.define(meta).pipe(
  Plugin.addModule(CommentConfig),
  Plugin.addModule(OperationHandler),
  Plugin.addModule(PageActionProvider),
  Plugin.addModule(PluginAsset),
  Plugin.addModule(ReactSurface),
  Plugin.addModule(Schema),
  Plugin.addModule(Translations),
  Plugin.make,
);

export default BookmarksPlugin;

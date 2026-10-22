//
// Copyright 2023 DXOS.org
//

import * as Plugin from '@dxos/app-framework/Plugin';

import {
  AppGraphBuilder,
  CreateObject,
  MarkdownExtension,
  OperationHandler,
  PluginAsset,
  ReactSurface,
  Schema,
  Translations,
} from '#capabilities';
import { meta } from '#meta';

// TODO(burdon): Only scale markdown content.
// TODO(burdon): Map stack content; Slide content type (e.g., markdown, sketch, IPFS image, table, etc.)

export const PresenterPlugin = Plugin.define(meta).pipe(
  Plugin.addModule(AppGraphBuilder),
  Plugin.addModule(CreateObject),
  Plugin.addModule(MarkdownExtension),
  Plugin.addModule(OperationHandler),
  Plugin.addModule(PluginAsset),
  Plugin.addModule(ReactSurface),
  Plugin.addModule(Schema),
  Plugin.addModule(Translations),
  Plugin.make,
);

export default PresenterPlugin;

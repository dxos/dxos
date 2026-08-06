//
// Copyright 2025 DXOS.org
//

import * as Plugin from '@dxos/app-framework/Plugin';
import * as AppCapability from '@dxos/app-toolkit/AppCapability';

import {
  AppGraphBuilder,
  OperationHandler,
  ReactRoot,
  ReactSurface,
  SpotlightDismiss,
  State,
  UrlHandler,
} from '#capabilities';
import { meta } from '#meta';
import { translations } from '#translations';

export type SimpleLayoutPluginOptions = {
  /** Determines if running in popover window context (hides mobile-specific UI). */
  isPopover?: boolean;
};

export const SimpleLayoutPlugin = Plugin.define<SimpleLayoutPluginOptions>(meta).pipe(
  Plugin.addModule(AppGraphBuilder),
  Plugin.addModule(OperationHandler),
  Plugin.addModule(AppCapability.translations(translations)),
  Plugin.addModule(State),
  Plugin.addModule(SpotlightDismiss),
  Plugin.addModule(ReactRoot),
  Plugin.addModule(ReactSurface),
  Plugin.addModule(UrlHandler),
  Plugin.make,
);

export default SimpleLayoutPlugin;

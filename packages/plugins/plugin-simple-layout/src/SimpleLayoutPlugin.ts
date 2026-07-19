//
// Copyright 2025 DXOS.org
//

import { Plugin } from '@dxos/app-framework';
import { AppCapability } from '@dxos/app-toolkit';

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
  Plugin.addLazyModule(AppGraphBuilder),
  Plugin.addLazyModule(OperationHandler),
  Plugin.addLazyModule(AppCapability.translations(translations)),
  Plugin.addLazyModule(State),
  Plugin.addLazyModule(SpotlightDismiss),
  Plugin.addLazyModule(ReactRoot),
  Plugin.addLazyModule(ReactSurface),
  Plugin.addLazyModule(UrlHandler),
  Plugin.make,
);

export default SimpleLayoutPlugin;

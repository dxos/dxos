//
// Copyright 2025 DXOS.org
//

import { Capability, Plugin } from '@dxos/app-framework';
import { AppPlugin } from '@dxos/app-toolkit';

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
  AppPlugin.addAppGraphModule({
    requires: AppGraphBuilder.requires,
    provides: AppGraphBuilder.provides,
    activate: AppGraphBuilder,
  }),
  AppPlugin.addOperationHandlerModule({
    requires: OperationHandler.requires,
    provides: OperationHandler.provides,
    activate: OperationHandler,
  }),
  AppPlugin.addTranslationsModule({ translations }),
  Plugin.addModule(({ isPopover = false }) => ({
    id: Capability.getModuleTag(State),
    requires: State.requires,
    provides: State.provides,
    activate: () => State({ initialState: { isPopover } }),
  })),
  Plugin.addModule(({ isPopover = false }) => ({
    id: Capability.getModuleTag(SpotlightDismiss),
    requires: SpotlightDismiss.requires,
    provides: SpotlightDismiss.provides,
    activate: () => SpotlightDismiss({ isPopover }),
  })),
  Plugin.addLazyModule(ReactRoot),
  Plugin.addLazyModule(ReactSurface),
  Plugin.addLazyModule(UrlHandler),
  Plugin.make,
);

export default SimpleLayoutPlugin;

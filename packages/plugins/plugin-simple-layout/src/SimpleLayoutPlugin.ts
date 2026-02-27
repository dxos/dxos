//
// Copyright 2025 DXOS.org
//

import { ActivationEvent, ActivationEvents, Capability, Plugin } from '@dxos/app-framework';
import { AppActivationEvents, AppPlugin } from '@dxos/app-toolkit';

import { OperationResolver, ReactRoot, ReactSurface, SpotlightDismiss, State, UrlHandler } from './capabilities';
import { meta } from './meta';
import { translations } from './translations';
import { SimpleLayoutEvents } from './types';

export type SimpleLayoutPluginOptions = {
  /** Whether running in popover window context (hides mobile-specific UI). */
  isPopover?: boolean;
};

export const SimpleLayoutPlugin = Plugin.define<SimpleLayoutPluginOptions>(meta).pipe(
  AppPlugin.addOperationResolverModule({ activate: OperationResolver }),
  AppPlugin.addTranslationsModule({ translations }),
  Plugin.addModule(({ isPopover = false }) => ({
    id: Capability.getModuleTag(State),
    activatesOn: ActivationEvents.Startup,
    activatesAfter: [SimpleLayoutEvents.StateReady, AppActivationEvents.LayoutReady],
    activate: () => State({ initialState: { isPopover } }),
  })),
  Plugin.addModule(({ isPopover = false }) => ({
    id: Capability.getModuleTag(SpotlightDismiss),
    activatesOn: ActivationEvents.Startup,
    activate: () => SpotlightDismiss({ isPopover }),
  })),
  Plugin.addModule({
    id: Capability.getModuleTag(ReactRoot),
    activatesOn: ActivationEvents.Startup,
    activate: ReactRoot,
  }),
  Plugin.addModule({
    id: Capability.getModuleTag(ReactSurface),
    activatesOn: ActivationEvents.Startup,
    activate: ReactSurface,
  }),
  Plugin.addModule({
    id: Capability.getModuleTag(UrlHandler),
    activatesOn: ActivationEvent.allOf(ActivationEvents.OperationInvokerReady, SimpleLayoutEvents.StateReady),
    activate: UrlHandler,
  }),
  Plugin.make,
);

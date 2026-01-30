//
// Copyright 2025 DXOS.org
//

import { ActivationEvent, Capability, Common, Plugin } from '@dxos/app-framework';

import { OperationResolver, ReactRoot, SpotlightDismiss, State, UrlHandler } from './capabilities';
import { meta } from './meta';
import { translations } from './translations';
import { SimpleLayoutEvents } from './types';

export type SimpleLayoutPluginOptions = {
  /** Whether running in popover window context (hides mobile-specific UI). */
  isPopover?: boolean;
};

export const SimpleLayoutPlugin = Plugin.define<SimpleLayoutPluginOptions>(meta).pipe(
  Plugin.addModule(({ isPopover = false }) => ({
    id: Capability.getModuleTag(State),
    activatesOn: Common.ActivationEvent.Startup,
    activatesAfter: [SimpleLayoutEvents.StateReady, Common.ActivationEvent.LayoutReady],
    activate: () => State({ initialState: { isPopover } }),
  })),
  Plugin.addModule(({ isPopover = false }) => ({
    id: Capability.getModuleTag(SpotlightDismiss),
    activatesOn: Common.ActivationEvent.Startup,
    activate: () => SpotlightDismiss({ isPopover }),
  })),
  Plugin.addModule({
    id: Capability.getModuleTag(ReactRoot),
    activatesOn: Common.ActivationEvent.Startup,
    activate: ReactRoot,
  }),
  Plugin.addModule({
    id: Capability.getModuleTag(UrlHandler),
    activatesOn: ActivationEvent.allOf(Common.ActivationEvent.OperationInvokerReady, SimpleLayoutEvents.StateReady),
    activate: UrlHandler,
  }),
  Common.Plugin.addOperationResolverModule({ activate: OperationResolver }),
  Common.Plugin.addTranslationsModule({ translations }),
  Plugin.make,
);

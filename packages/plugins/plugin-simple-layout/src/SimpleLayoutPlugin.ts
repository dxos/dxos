//
// Copyright 2025 DXOS.org
//

import { Capability, Common, Plugin } from '@dxos/app-framework';

import { OperationResolver, ReactRoot, type SimpleLayoutStateOptions, State } from './capabilities';
import { meta } from './meta';
import { translations } from './translations';

export type SimpleLayoutPluginOptions = {
  /** Whether running in popover window context (hides mobile-specific UI). */
  isPopover?: boolean;
};

export const SimpleLayoutPlugin = Plugin.define<SimpleLayoutPluginOptions>(meta).pipe(
  Plugin.addModule(({ isPopover = false }) => ({
    id: Capability.getModuleTag(State),
    activatesOn: Common.ActivationEvent.Startup,
    activatesAfter: [Common.ActivationEvent.LayoutReady],
    activate: () => State({ initialState: { isPopover } } satisfies SimpleLayoutStateOptions),
  })),
  Plugin.addModule({
    id: Capability.getModuleTag(ReactRoot),
    activatesOn: Common.ActivationEvent.Startup,
    activate: ReactRoot,
  }),
  Common.Plugin.addOperationResolverModule({ activate: OperationResolver }),
  Common.Plugin.addTranslationsModule({ translations }),
  Plugin.make,
);

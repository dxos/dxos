//
// Copyright 2025 DXOS.org
//

import { ActivationEvents, Capability, Plugin } from '@dxos/app-framework';
import { AppActivationEvents, AppPlugin } from '@dxos/app-toolkit';

import { meta } from './meta';
import { translations } from './translations';
import { SpotlightEvents } from './types';

import { OperationHandler, ReactRoot, SpotlightDismiss, State } from '#capabilities';

export const SpotlightPlugin = Plugin.define(meta).pipe(
  AppPlugin.addOperationHandlerModule({ activate: OperationHandler }),
  AppPlugin.addTranslationsModule({ translations }),
  Plugin.addModule({
    id: Capability.getModuleTag(State),
    activatesOn: ActivationEvents.Startup,
    activatesAfter: [SpotlightEvents.StateReady, AppActivationEvents.LayoutReady],
    activate: State,
  }),
  Plugin.addModule({
    id: Capability.getModuleTag(SpotlightDismiss),
    activatesOn: ActivationEvents.Startup,
    activate: SpotlightDismiss,
  }),
  Plugin.addModule({
    id: Capability.getModuleTag(ReactRoot),
    activatesOn: ActivationEvents.Startup,
    activate: ReactRoot,
  }),
  Plugin.make,
);

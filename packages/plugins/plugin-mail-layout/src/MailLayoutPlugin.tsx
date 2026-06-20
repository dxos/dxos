//
// Copyright 2026 DXOS.org
//

import { ActivationEvents, Capability, Plugin } from '@dxos/app-framework';
import { AppActivationEvents, AppPlugin } from '@dxos/app-toolkit';

import { LayoutState, OperationHandler, ReactRoot } from '#capabilities';
import { meta } from '#meta';
import { translations } from '#translations';

export const MailLayoutPlugin = Plugin.define(meta).pipe(
  AppPlugin.addOperationHandlerModule({ activate: OperationHandler }),
  AppPlugin.addTranslationsModule({ translations }),
  Plugin.addModule({
    id: Capability.getModuleTag(LayoutState),
    activatesOn: ActivationEvents.Startup,
    firesAfterActivation: [AppActivationEvents.LayoutReady],
    activate: LayoutState,
  }),
  Plugin.addModule({
    id: Capability.getModuleTag(ReactRoot),
    activatesOn: ActivationEvents.Startup,
    activate: ReactRoot,
  }),
  Plugin.make,
);

export default MailLayoutPlugin;

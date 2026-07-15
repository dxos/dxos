//
// Copyright 2026 DXOS.org
//

import { ActivationEvent, ActivationEvents, Capability, Plugin } from '@dxos/app-framework';
import { AppActivationEvents, AppPlugin } from '@dxos/app-toolkit';

import { ProgressRegistry, ReactSurface, TraceProgressSink } from '#capabilities';
import { meta } from '#meta';
import { translations } from '#translations';

export const ProgressPlugin = Plugin.define(meta).pipe(
  Plugin.addModule({
    id: 'progress-registry',
    activatesOn: ActivationEvents.Startup,
    firesAfterActivation: [AppActivationEvents.ProgressRegistryReady],
    activate: () => ProgressRegistry(),
  }),
  Plugin.addModule({
    id: 'trace-progress-sink',
    activatesOn: ActivationEvent.allOf(
      ActivationEvents.SetupProcessManager,
      AppActivationEvents.ProgressRegistryReady,
    ),
    activate: () => TraceProgressSink(),
  }),
  Plugin.addModule({
    id: Capability.getModuleTag(ReactSurface) ?? 'surfaces',
    activatesOn: ActivationEvents.SetupReactSurface,
    activate: () => ReactSurface(),
  }),
  AppPlugin.addTranslationsModule({ translations }),
  Plugin.make,
);

export default ProgressPlugin;

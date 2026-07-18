//
// Copyright 2026 DXOS.org
//

import { Capabilities, Capability, Plugin } from '@dxos/app-framework';
import { AppCapabilities, AppPlugin } from '@dxos/app-toolkit';

import { ProgressRegistry, ReactSurface, TraceProgressSink } from '#capabilities';
import { meta } from '#meta';
import { translations } from '#translations';

export const ProgressPlugin = Plugin.define(meta).pipe(
  Plugin.addModule({
    id: 'progress-registry',
    requires: [Capabilities.AtomRegistry],
    provides: [AppCapabilities.ProgressRegistry],
    activate: () => ProgressRegistry(),
  }),
  Plugin.addModule({
    id: 'trace-progress-sink',
    activatesOn: ActivationEvents.SetupProcessManager,
    activate: () => TraceProgressSink(),
  }),
  Plugin.addModule({
    id: Capability.getModuleTag(ReactSurface) ?? 'surfaces',
    requires: [],
    provides: [Capabilities.ReactSurface],
    activate: () => ReactSurface(),
  }),
  AppPlugin.addTranslationsModule({ translations }),
  Plugin.make,
);

export default ProgressPlugin;

//
// Copyright 2026 DXOS.org
//

import { ActivationEvent, Plugin } from '@dxos/app-framework';
import { AppActivationEvents, AppPlugin } from '@dxos/app-toolkit';

import { AppGraphBuilder, VersioningState } from '#capabilities';
import { meta } from '#meta';

export const VersioningPlugin = Plugin.define(meta).pipe(
  AppPlugin.addAppGraphModule({ activate: AppGraphBuilder }),
  Plugin.addModule({
    activatesOn: ActivationEvent.oneOf(AppActivationEvents.SetupSettings, AppActivationEvents.SetupAppGraph),
    activate: VersioningState,
  }),
  Plugin.make,
);

export default VersioningPlugin;

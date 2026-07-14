//
// Copyright 2026 DXOS.org
//

import { ActivationEvents, Plugin } from '@dxos/app-framework';
import { AppActivationEvents, AppPlugin } from '@dxos/app-toolkit';

import { Connector, GenerationService, ReactSurface } from '#capabilities';
import { meta } from '#meta';

export const HeyGenPlugin = Plugin.define(meta).pipe(
  Plugin.addModule({
    id: `${meta.profile.key}/connector`,
    activatesOn: AppActivationEvents.SetupConnectors,
    activate: Connector,
  }),
  Plugin.addModule({
    id: `${meta.profile.key}/generation-service`,
    activatesOn: ActivationEvents.Startup,
    activate: GenerationService,
  }),
  AppPlugin.addSurfaceModule({ activate: ReactSurface }),
  Plugin.make,
);

export default HeyGenPlugin;

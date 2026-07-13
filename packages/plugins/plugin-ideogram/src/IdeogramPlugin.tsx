//
// Copyright 2026 DXOS.org
//

import { ActivationEvents, Plugin } from '@dxos/app-framework';
import { AppActivationEvents } from '@dxos/app-toolkit';

import { Connector, GenerationService } from '#capabilities';
import { meta } from '#meta';

export const IdeogramPlugin = Plugin.define(meta).pipe(
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
  Plugin.make,
);

export default IdeogramPlugin;

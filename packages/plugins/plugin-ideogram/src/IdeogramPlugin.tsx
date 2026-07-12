//
// Copyright 2026 DXOS.org
//

import { ActivationEvents, Plugin } from '@dxos/app-framework';
import { AppActivationEvents } from '@dxos/app-toolkit';

import { Connector, ImageGenerationService } from '#capabilities';
import { meta } from '#meta';

export const IdeogramPlugin = Plugin.define(meta).pipe(
  Plugin.addModule({
    id: `${meta.profile.key}/connector`,
    activatesOn: AppActivationEvents.SetupConnectors,
    activate: Connector,
  }),
  Plugin.addModule({
    id: `${meta.profile.key}/image-generation-service`,
    activatesOn: ActivationEvents.Startup,
    activate: ImageGenerationService,
  }),
  Plugin.make,
);

export default IdeogramPlugin;

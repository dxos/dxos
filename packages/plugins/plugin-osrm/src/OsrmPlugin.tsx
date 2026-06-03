//
// Copyright 2026 DXOS.org
//

import { ActivationEvents, Plugin } from '@dxos/app-framework';

import { Osrm } from '#capabilities';
import { meta } from '#meta';

export const OsrmPlugin = Plugin.define(meta).pipe(
  Plugin.addModule({
    id: `${meta.id}/osrm`,
    activatesOn: ActivationEvents.Startup,
    activate: Osrm,
  }),
  Plugin.make,
);

export default OsrmPlugin;

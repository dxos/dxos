//
// Copyright 2026 DXOS.org
//

import { Plugin } from '@dxos/app-framework';

import { RoutingService } from '#capabilities';
import { meta } from '#meta';

export const OsrmPlugin = Plugin.define(meta).pipe(Plugin.addLazyModule(RoutingService), Plugin.make);

export default OsrmPlugin;

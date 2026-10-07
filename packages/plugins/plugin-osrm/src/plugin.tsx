//
// Copyright 2026 DXOS.org
//

import * as Plugin from '@dxos/app-framework/Plugin';

import { RoutingService } from '#capabilities';
import { meta } from '#meta';

export const OsrmPlugin = Plugin.define(meta).pipe(Plugin.addModule(RoutingService), Plugin.make);

export default OsrmPlugin;

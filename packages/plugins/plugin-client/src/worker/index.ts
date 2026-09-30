//
// Copyright 2026 DXOS.org
//

import * as Plugin from '@dxos/app-framework/Plugin';

import { meta } from '#meta';

import { ClientServices } from './client-services.ts';

/**
 * The client plugin's worker half, loaded by URL into `@dxos/app-framework/worker`: the client
 * services, served to every tab. A separate entry, so none of the tab-side modules reach the worker.
 */
export const ClientWorkerPlugin = Plugin.define(meta).pipe(Plugin.addModule(ClientServices), Plugin.make);

export default ClientWorkerPlugin;

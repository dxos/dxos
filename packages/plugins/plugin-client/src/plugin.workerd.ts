//
// Copyright 2025 DXOS.org
//

import * as Plugin from '@dxos/app-framework/Plugin';

import { OperationHandler } from '#capabilities';
import { meta } from '#meta';

export const ClientPlugin = Plugin.define(meta).pipe(Plugin.addModule(OperationHandler), Plugin.make);

export default ClientPlugin;

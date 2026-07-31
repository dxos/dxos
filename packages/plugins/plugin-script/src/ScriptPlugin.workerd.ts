//
// Copyright 2023 DXOS.org
//

import { Plugin } from '@dxos/app-framework';
import * as AppCapability from '@dxos/app-toolkit/AppCapability';
import * as Script from '@dxos/compute/Script';

import { OperationHandler } from '#capabilities';
import { meta } from '#meta';

export const ScriptPlugin = Plugin.define(meta).pipe(
  Plugin.addModule(OperationHandler),
  Plugin.addModule(AppCapability.schema([Script.Script])),
  Plugin.make,
);

export default ScriptPlugin;

//
// Copyright 2025 DXOS.org
//

import * as Plugin from '@dxos/app-framework/Plugin';
import * as AppCapability from '@dxos/app-toolkit/AppCapability';

import { meta } from '#meta';

import { plugin, registry } from './commands';

export const RegistryPlugin = Plugin.define(meta).pipe(
  Plugin.addModule(AppCapability.commands([plugin, registry])),
  Plugin.make,
);

export default RegistryPlugin;

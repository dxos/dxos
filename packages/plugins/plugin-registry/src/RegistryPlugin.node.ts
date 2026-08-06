//
// Copyright 2025 DXOS.org
//

import * as Plugin from '@dxos/app-framework/Plugin';
import * as AppCapability from '@dxos/app-toolkit/AppCapability';

import { meta } from '#meta';

export const RegistryPlugin = Plugin.define(meta).pipe(
  Plugin.addModule(AppCapability.commands(() => import('./command-defs'))),
  Plugin.make,
);

export default RegistryPlugin;

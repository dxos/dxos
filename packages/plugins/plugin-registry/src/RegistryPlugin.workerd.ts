//
// Copyright 2025 DXOS.org
//

import { Plugin } from '@dxos/app-framework';

import { meta } from '#meta';

export const RegistryPlugin = Plugin.define(meta).pipe(Plugin.make);

export default RegistryPlugin;

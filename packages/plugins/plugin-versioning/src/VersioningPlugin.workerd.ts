//
// Copyright 2026 DXOS.org
//

import { Plugin } from '@dxos/app-framework';

import { meta } from '#meta';

export const VersioningPlugin = Plugin.define(meta).pipe(Plugin.make);

export default VersioningPlugin;

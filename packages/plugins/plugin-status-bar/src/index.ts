//
// Copyright 2023 DXOS.org
//

// TODO(wittjosiah): StatusBar should be factored out of plugin-status-bar into a shared UI package.
import { Plugin } from '@dxos/app-framework';

import { meta } from './meta';

export * from './meta';

export const StatusBarPlugin = Plugin.lazy(meta, () => import('#plugin'));

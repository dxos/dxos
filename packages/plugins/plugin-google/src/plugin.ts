//
// Copyright 2026 DXOS.org
//

import * as Plugin from '@dxos/app-framework/Plugin';

import { meta } from './meta';

export const GooglePlugin = Plugin.lazy(meta, () => import('#plugin'));

export { GoogleOperationHandlerSet } from './operations';

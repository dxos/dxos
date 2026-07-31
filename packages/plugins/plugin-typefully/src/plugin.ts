//
// Copyright 2026 DXOS.org
//

import * as Plugin from '@dxos/app-framework/Plugin';

import { meta } from './meta';

export const TypefullyPlugin = Plugin.lazy(meta, () => import('#plugin'));

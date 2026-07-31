//
// Copyright 2023 DXOS.org
//

import * as Plugin from '@dxos/app-framework/Plugin';

import { meta } from './meta';

export const ObservabilityPlugin = Plugin.lazy(meta, () => import('#plugin'));

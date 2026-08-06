//
// Copyright 2025 DXOS.org
//

import * as Plugin from '@dxos/app-framework/Plugin';

import { meta } from './meta';

export const CodePlugin = Plugin.lazy(meta, () => import('#plugin'));

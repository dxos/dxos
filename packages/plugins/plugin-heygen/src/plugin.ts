//
// Copyright 2026 DXOS.org
//

import { Plugin } from '@dxos/app-framework';

import { meta } from './meta';

export const HeyGenPlugin = Plugin.lazy(meta, () => import('#plugin'));

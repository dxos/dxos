//
// Copyright 2024 DXOS.org
//

import { Plugin } from '@dxos/app-framework';

import { meta } from './meta';

export const WnfsPlugin = Plugin.lazy(meta, () => import('#plugin'));

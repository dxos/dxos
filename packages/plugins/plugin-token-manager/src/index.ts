//
// Copyright 2025 DXOS.org
//

import { Plugin } from '@dxos/app-framework';

import { meta } from './meta';

export { meta };
export const TokenManagerPlugin = Plugin.lazy(meta, () => import('./TokenManagerPlugin'));

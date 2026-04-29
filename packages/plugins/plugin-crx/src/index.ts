//
// Copyright 2026 DXOS.org
//

import { Plugin } from '@dxos/app-framework';

import { meta } from './meta';

export { meta };
export const CrxPlugin = Plugin.lazy(meta, () => import('./CrxPlugin'));

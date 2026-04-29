//
// Copyright 2025 DXOS.org
//

import { Plugin } from '@dxos/app-framework';

import { meta } from './meta';

export { meta };
export const FeedPlugin = Plugin.lazy(meta, () => import('./FeedPlugin'));

export * from './operations';

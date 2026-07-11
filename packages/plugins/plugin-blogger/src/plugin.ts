//
// Copyright 2026 DXOS.org
//

import { Plugin } from '@dxos/app-framework';

import { meta } from './meta';

export const BloggerPlugin = Plugin.lazy(meta, () => import('#plugin'));

export { BloggerOperationHandlerSet } from './operations';

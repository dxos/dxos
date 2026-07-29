//
// Copyright 2023 DXOS.org
//

import { Plugin } from '@dxos/app-framework';

import { meta } from './meta';

export const ReviewPlugin = Plugin.lazy(meta, () => import('#plugin'));

export { CommentOperationHandlerSet } from './operations';

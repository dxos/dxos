//
// Copyright 2026 DXOS.org
//

import { Plugin } from '@dxos/app-framework';

import { meta } from './meta';

export const VideoPlugin = Plugin.lazy(meta, () => import('#plugin'));

export { VideoOperationHandlerSet } from './operations';

//
// Copyright 2024 DXOS.org
//

import { Plugin } from '@dxos/app-framework';

import { meta } from './meta';

export const InboxPlugin = Plugin.lazy(meta, () => import('#plugin'));

export { InboxOperationHandlerSet } from './operations';

//
// Copyright 2023 DXOS.org
//

import { Plugin } from '@dxos/app-framework';

import { meta } from './meta';

export * from './meta';

export const InboxPlugin = Plugin.lazy(meta, () => import('#plugin'));

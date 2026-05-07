//
// Copyright 2023 DXOS.org
//

import { Plugin } from '@dxos/app-framework';

import { meta } from './meta';

export * from './meta';
// TODO(wittjosiah): Remove. This is needed for debug plugin currently.
export * from './operations';

export const InboxPlugin = Plugin.lazy(meta, () => import('#plugin'));

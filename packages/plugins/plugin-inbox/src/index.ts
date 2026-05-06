//
// Copyright 2023 DXOS.org
//

import { Plugin } from '@dxos/app-framework';

import { meta } from './meta';

export const InboxPlugin = Plugin.lazy(meta, () => import('./InboxPlugin'));

export * from './meta';

// TODO(wittjosiah): Remove. This is needed for debug plugin currently.

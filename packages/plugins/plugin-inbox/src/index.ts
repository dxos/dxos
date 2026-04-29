//
// Copyright 2023 DXOS.org
//

import { Plugin } from '@dxos/app-framework';

import { meta } from './meta';

export { meta };
export const InboxPlugin = Plugin.lazy(meta, () => import('./InboxPlugin'));

// TODO(wittjosiah): Remove. This is needed for debug plugin currently.
export * from './operations';

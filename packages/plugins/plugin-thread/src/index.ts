//
// Copyright 2023 DXOS.org
//

import { Plugin } from '@dxos/app-framework';

import { meta } from './meta';

export { meta };
export const ThreadPlugin = Plugin.lazy(meta, () => import('./ThreadPlugin'));

export { ThreadCapabilities } from './types';
export * from './calls';
export * from './hooks';

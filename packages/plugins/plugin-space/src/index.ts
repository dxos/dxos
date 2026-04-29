//
// Copyright 2023 DXOS.org
//

import { Plugin } from '@dxos/app-framework';

import { meta } from './meta';

export { meta };
export const SpacePlugin = Plugin.lazy(meta, () => import('./SpacePlugin'));

export { SpaceCapabilities, SpaceEvents } from './types';

export * from './components';
export * from './util';

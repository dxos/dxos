//
// Copyright 2023 DXOS.org
//

import { Plugin } from '@dxos/app-framework';

import { meta } from './meta';

export { SpaceCapabilities, SpaceEvents } from './types';

export * from './meta';
export * from './util';

export const SpacePlugin = Plugin.lazy(meta, () => import('#plugin'));

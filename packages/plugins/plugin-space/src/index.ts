//
// Copyright 2023 DXOS.org
//

import { Plugin } from '@dxos/app-framework';

import { meta } from './meta';

export * from './meta';
export * from './types';
export * from './util';

export { CollectionOperation, SpaceOperation } from './operations/definitions';

export const SpacePlugin = Plugin.lazy(meta, () => import('#plugin'));

//
// Copyright 2023 DXOS.org
//

import { Plugin } from '@dxos/app-framework';

import { meta } from './meta';

export * from './blueprints';
export * from './meta';
export * from './types';

export const ChessPlugin = Plugin.lazy(meta, () => import('#plugin'));

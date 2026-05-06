//
// Copyright 2023 DXOS.org
//

import { Plugin } from '@dxos/app-framework';

import { meta } from './meta';

export const DebugPlugin = Plugin.lazy(meta, () => import('./DebugPlugin'));

export * from './meta';

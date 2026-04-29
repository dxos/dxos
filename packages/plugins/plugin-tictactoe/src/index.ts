//
// Copyright 2026 DXOS.org
//

import { Plugin } from '@dxos/app-framework';

import { meta } from './meta';

export { meta };
export const TicTacToePlugin = Plugin.lazy(meta, () => import('./TicTacToePlugin'));

export * from './types';

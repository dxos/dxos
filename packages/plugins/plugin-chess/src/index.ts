//
// Copyright 2023 DXOS.org
//

import { Plugin } from '@dxos/app-framework';

import { meta } from './meta';

export const ChessPlugin = Plugin.lazy(meta, () => import('./ChessPlugin'));

export * from './meta';

export * from './components/Chessboard';

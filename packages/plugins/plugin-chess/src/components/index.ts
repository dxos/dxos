//
// Copyright 2023 DXOS.org
//

import { lazy } from 'react';

export * from './Chess';
export * from './Chessboard';

export const ChessContainer = lazy(() => import('./ChessContainer'));

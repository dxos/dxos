//
// Copyright 2026 DXOS.org
//

import { type ComponentType, lazy } from 'react';

export const TicTacToeArticle: ComponentType<any> = lazy(() => import('./TicTacToeArticle'));
export const TicTacToeCard: ComponentType<any> = lazy(() => import('./TicTacToeCard'));

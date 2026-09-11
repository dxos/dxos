//
// Copyright 2024 DXOS.org
//

import { type ComponentType, lazy } from 'react';

export const ChessArticle: ComponentType<any> = lazy(() => import('./ChessArticle/index.ts'));
export const ChessCard: ComponentType<any> = lazy(() => import('./ChessCard/index.ts'));

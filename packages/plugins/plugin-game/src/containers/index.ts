//
// Copyright 2026 DXOS.org
//

import { type ComponentType, lazy } from 'react';

export const GameArticle: ComponentType<any> = lazy(() => import('./GameArticle/index.ts'));
export const GameCard: ComponentType<any> = lazy(() => import('./GameCard/index.ts'));

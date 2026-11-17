//
// Copyright 2023 DXOS.org
//

import { type ComponentType, lazy } from 'react';

export const TldrawArticle: ComponentType<any> = lazy(() => import('./TldrawArticle/index.ts'));
export const TldrawCard: ComponentType<any> = lazy(() => import('./TldrawCard/index.ts'));

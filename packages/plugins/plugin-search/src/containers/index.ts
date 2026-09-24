//
// Copyright 2025 DXOS.org
//

import { type ComponentType, lazy } from 'react';

export const SearchDialog: ComponentType<any> = lazy(() => import('./SearchDialog/index.ts'));
export const SearchArticle: ComponentType<any> = lazy(() => import('./SearchArticle/index.ts'));

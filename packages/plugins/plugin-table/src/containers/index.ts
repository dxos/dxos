//
// Copyright 2024 DXOS.org
//

import { type ForwardRefExoticComponent, lazy } from 'react';

import { type TableArticleProps } from './TableArticle/index.ts';

export type { TableArticleProps };

export const TableCard = lazy(() => import('./TableCard/index.ts'));
export const TableArticle: ForwardRefExoticComponent<TableArticleProps> = lazy(() => import('./TableArticle/index.ts'));

//
// Copyright 2024 DXOS.org
//

import { type ForwardRefExoticComponent, lazy } from 'react';

import { type TableArticleProps } from './TableArticle';

export type { TableArticleProps };

export const TableCard = lazy(() => import('./TableCard'));
export const TableArticle: ForwardRefExoticComponent<TableArticleProps> = lazy(() => import('./TableArticle'));

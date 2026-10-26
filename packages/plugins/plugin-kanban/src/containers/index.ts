//
// Copyright 2024 DXOS.org
//

import { type ComponentType, lazy } from 'react';

export const KanbanArticle: ComponentType<any> = lazy(() => import('./KanbanArticle/index.ts'));
export const KanbanCard: ComponentType<any> = lazy(() => import('./KanbanCard/index.ts'));
export const KanbanProperties: ComponentType<any> = lazy(() => import('./KanbanProperties/index.ts'));
